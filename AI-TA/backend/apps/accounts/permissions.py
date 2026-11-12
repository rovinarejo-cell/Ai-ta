from rest_framework.permissions import BasePermission
from .models import User


class IsActiveAccount(BasePermission):
    """Explicit role allowlist; Django's session backend also rejects inactive users."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_active and user.role in User.Role.values)


class IsTeacher(IsActiveAccount):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.TEACHER


class IsAdministrator(IsActiveAccount):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == User.Role.ADMINISTRATOR
