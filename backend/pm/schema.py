import graphene
from graphene_django import DjangoObjectType

from .models import Organization, Project, Task, TaskComment


class OrganizationType(DjangoObjectType):
    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "contact_email")


class ProjectType(DjangoObjectType):
    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "status",
            "due_date",
            "created_at",
        )


class TaskType(DjangoObjectType):
    class Meta:
        model = Task
        fields = (
            "id",
            "title",
            "description",
            "status",
            "assignee_email",
            "due_date",
            "created_at",
        )


class TaskCommentType(DjangoObjectType):
    class Meta:
        model = TaskComment
        fields = ("id", "content", "author_email", "created_at")


class Query(graphene.ObjectType):
    projects = graphene.List(ProjectType)

    def resolve_projects(root, info):
        request = info.context

        if not hasattr(request, "org") or request.org is None:
            raise Exception("Organization context missing")

        return Project.objects.filter(organization=request.org)



schema = graphene.Schema(query=Query)
