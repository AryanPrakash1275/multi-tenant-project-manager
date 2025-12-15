from .models import Organization


class OrganizationContextMiddleware:
    """
    Loads organization from x-org-slug header
    and attaches it to request.org
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        slug = request.headers.get("x-org-slug")

        if slug:
            try:
                request.org = Organization.objects.get(slug=slug)
            except Organization.DoesNotExist:
                request.org = None
        else:
            request.org = None

        return self.get_response(request)
