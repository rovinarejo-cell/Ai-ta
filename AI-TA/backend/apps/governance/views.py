from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    """API liveness only: deliberately does not inspect a database or records."""
    authentication_classes = []  # Liveness must not depend on a session database.
    permission_classes = [AllowAny]
    http_method_names = ["get", "head", "options"]

    def get(self, request):
        return Response({"status": "ok", "service": "ai-ta-backend", "version": request.version})
