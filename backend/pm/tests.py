import json
from django.test import TestCase, Client
from pm.models import Organization, Project, Task


def gql(client: Client, query: str, variables=None, org_slug=None):
    headers = {}
    if org_slug:
        headers["HTTP_X_ORG_SLUG"] = org_slug

    payload = {"query": query, "variables": variables or {}}
    return client.post(
        "/graphql/",
        data=json.dumps(payload),
        content_type="application/json",
        **headers,
    )


class MultiTenantGraphQLTests(TestCase):
    def setUp(self):
        self.client = Client()

        self.org_a = Organization.objects.create(
            name="Acme",
            slug="acme",
            contact_email="acme@example.com",
        )
        self.org_b = Organization.objects.create(
            name="Beta",
            slug="beta",
            contact_email="beta@example.com",
        )

        self.project_a = Project.objects.create(
            organization=self.org_a,
            name="Project A",
            status="ACTIVE",
        )
        self.project_b = Project.objects.create(
            organization=self.org_b,
            name="Project B",
            status="ACTIVE",
        )

        Task.objects.create(project=self.project_a, title="A1", status="TODO")
        Task.objects.create(project=self.project_a, title="A2", status="DONE")
        Task.objects.create(project=self.project_b, title="B1", status="TODO")

    def test_organizations_query_is_global(self):
        query = """
        query {
          organizations { slug }
        }
        """
        res = gql(self.client, query)
        self.assertEqual(res.status_code, 200)

        body = res.json()
        self.assertNotIn("errors", body)

        slugs = {o["slug"] for o in body["data"]["organizations"]}
        self.assertEqual(slugs, {"acme", "beta"})

    def test_projects_requires_org(self):
        query = """
        query {
          projects { id }
        }
        """
        res = gql(self.client, query)
        body = res.json()

        self.assertIn("errors", body)
        self.assertGreater(len(body["errors"]), 0)

    def test_projects_are_scoped_to_org(self):
        query = """
        query {
          projects { name }
        }
        """

        res_a = gql(self.client, query, org_slug="acme").json()
        names_a = {p["name"] for p in res_a["data"]["projects"]}
        self.assertEqual(names_a, {"Project A"})

        res_b = gql(self.client, query, org_slug="beta").json()
        names_b = {p["name"] for p in res_b["data"]["projects"]}
        self.assertEqual(names_b, {"Project B"})

    def test_cross_tenant_task_access_blocked(self):
        query = """
        query($projectId: ID!) {
          tasks(projectId: $projectId) { id }
        }
        """
        res = gql(
            self.client,
            query,
            variables={"projectId": str(self.project_b.id)},
            org_slug="acme",
        ).json()

        self.assertIn("errors", res)

    def test_project_stats_correct(self):
        query = """
        query($projectId: ID!) {
          projectStats(projectId: $projectId) {
            totalTasks
            doneTasks
            completionRate
          }
        }
        """
        res = gql(
            self.client,
            query,
            variables={"projectId": str(self.project_a.id)},
            org_slug="acme",
        ).json()

        stats = res["data"]["projectStats"]
        self.assertEqual(stats["totalTasks"], 2)
        self.assertEqual(stats["doneTasks"], 1)
        self.assertAlmostEqual(stats["completionRate"], 0.5)
