from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.debug import sensitive_post_parameters
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView
from .permissions import IsActiveAccount
from .serializers import AccountSerializer, LoginSerializer


class LoginThrottle(SimpleRateThrottle):
    scope = "login"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": request.META.get("REMOTE_ADDR", "unknown")}


@method_decorator(never_cache, name="dispatch")
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    http_method_names = ["get", "head", "options"]

    def get(self, request):
        # CSRF cookie is HTTP-only; clients obtain a masked token in this response.
        return Response({"csrfToken": get_token(request)})


@method_decorator(never_cache, name="dispatch")
@method_decorator(sensitive_post_parameters("password"), name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    # Anonymous login still requires CSRF: DRF session auth alone would not check it.
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]
    http_method_names = ["post", "options"]

    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        # Django rotates the session and CSRF token on successful login.
        return Response({"user": AccountSerializer(user).data, "csrfToken": get_token(request)})


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class LogoutView(APIView):
    permission_classes = [IsActiveAccount]
    http_method_names = ["post", "options"]

    def post(self, request):
        logout(request)
        return Response(status=204)


@method_decorator(never_cache, name="dispatch")
class MeView(APIView):
    permission_classes = [IsActiveAccount]
    http_method_names = ["get", "head", "options"]

    def get(self, request):
        return Response(AccountSerializer(request.user).data)
