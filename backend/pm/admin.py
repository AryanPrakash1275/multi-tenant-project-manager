from django.contrib import admin
from .models import Organization, Project, Task, TaskComment


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "slug", "contact_email", "created_at")
    search_fields = ("name", "slug", "contact_email")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "organization", "status", "due_date", "created_at")
    list_filter = ("status", "organization")
    search_fields = ("name", "organization__name", "organization__slug")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "project", "status", "assignee_email", "due_date", "created_at")
    list_filter = ("status", "project")
    search_fields = ("title", "project__name", "assignee_email")


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "author_email", "created_at")
    search_fields = ("author_email", "content")
