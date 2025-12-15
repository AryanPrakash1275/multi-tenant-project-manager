import graphene
from graphene_django import DjangoObjectType

from .models import Organization, Project, Task, TaskComment



# GraphQL Types

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


class ProjectStatsType(graphene.ObjectType):
    total_tasks = graphene.Int()
    done_tasks = graphene.Int()
    completion_rate = graphene.Float()



# Helpers

def require_org(info):
    request = info.context
    org = getattr(request, "org", None)
    if org is None:
        raise Exception("Organization context missing")
    return org



# Queries

class Query(graphene.ObjectType):
    projects = graphene.List(ProjectType)
    tasks = graphene.List(TaskType, project_id=graphene.ID(required=True))
    task_comments = graphene.List(TaskCommentType, task_id=graphene.ID(required=True))
    project_stats = graphene.Field(ProjectStatsType, project_id=graphene.ID(required=True))

    def resolve_projects(root, info):
        org = require_org(info)
        return Project.objects.filter(organization=org).order_by("-created_at")

    def resolve_tasks(root, info, project_id):
        org = require_org(info)

        # Ensure project belongs to org
        Project.objects.get(id=project_id, organization=org)

        return Task.objects.filter(project_id=project_id).order_by("-created_at")

    def resolve_task_comments(root, info, task_id):
        org = require_org(info)

        # Ensure task belongs to org
        Task.objects.get(id=task_id, project__organization=org)

        return TaskComment.objects.filter(task_id=task_id).order_by("created_at")

    def resolve_project_stats(root, info, project_id):
        org = require_org(info)

        # Ensure project belongs to org
        Project.objects.get(id=project_id, organization=org)

        qs = Task.objects.filter(project_id=project_id)
        total = qs.count()
        done = qs.filter(status="DONE").count()
        rate = (done / total) if total else 0.0

        return ProjectStatsType(
            total_tasks=total,
            done_tasks=done,
            completion_rate=rate,
        )



# Mutations

class CreateProject(graphene.Mutation):
    class Arguments:
        name = graphene.String(required=True)
        description = graphene.String()
        status = graphene.String()
        due_date = graphene.Date()

    project = graphene.Field(ProjectType)

    def mutate(self, info, name, description="", status="ACTIVE", due_date=None):
        org = require_org(info)

        project = Project.objects.create(
            organization=org,
            name=name,
            description=description or "",
            status=status or "ACTIVE",
            due_date=due_date,
        )
        return CreateProject(project=project)


class UpdateProject(graphene.Mutation):
    class Arguments:
        project_id = graphene.ID(required=True)
        name = graphene.String()
        description = graphene.String()
        status = graphene.String()
        due_date = graphene.Date()

    project = graphene.Field(ProjectType)

    def mutate(self, info, project_id, **kwargs):
        org = require_org(info)

        project = Project.objects.get(id=project_id, organization=org)

        for key, value in kwargs.items():
            if value is not None:
                setattr(project, key, value)

        project.save()
        return UpdateProject(project=project)


class CreateTask(graphene.Mutation):
    class Arguments:
        project_id = graphene.ID(required=True)
        title = graphene.String(required=True)
        description = graphene.String()
        status = graphene.String()
        assignee_email = graphene.String()
        due_date = graphene.DateTime()

    task = graphene.Field(TaskType)

    def mutate(self, info, project_id, title, **kwargs):
        org = require_org(info)

        project = Project.objects.get(id=project_id, organization=org)

        task = Task.objects.create(
            project=project,
            title=title,
            description=kwargs.get("description") or "",
            status=kwargs.get("status") or "TODO",
            assignee_email=kwargs.get("assignee_email") or "",
            due_date=kwargs.get("due_date"),
        )
        return CreateTask(task=task)


class UpdateTask(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        title = graphene.String()
        description = graphene.String()
        status = graphene.String()
        assignee_email = graphene.String()
        due_date = graphene.DateTime()

    task = graphene.Field(TaskType)

    def mutate(self, info, task_id, **kwargs):
        org = require_org(info)

        task = Task.objects.get(id=task_id, project__organization=org)

        for key, value in kwargs.items():
            if value is not None:
                setattr(task, key, value)

        task.save()
        return UpdateTask(task=task)


class AddTaskComment(graphene.Mutation):
    class Arguments:
        task_id = graphene.ID(required=True)
        content = graphene.String(required=True)
        author_email = graphene.String(required=True)

    comment = graphene.Field(TaskCommentType)

    def mutate(self, info, task_id, content, author_email):
        org = require_org(info)

        task = Task.objects.get(id=task_id, project__organization=org)

        comment = TaskComment.objects.create(
            task=task,
            content=content,
            author_email=author_email,
        )
        return AddTaskComment(comment=comment)


class Mutation(graphene.ObjectType):
    create_project = CreateProject.Field()
    update_project = UpdateProject.Field()
    create_task = CreateTask.Field()
    update_task = UpdateTask.Field()
    add_task_comment = AddTaskComment.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
