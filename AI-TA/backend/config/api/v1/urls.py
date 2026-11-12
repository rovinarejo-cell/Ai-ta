from django.urls import include, path

urlpatterns = [
    path("", include("apps.governance.urls")),
    path("auth/", include("apps.accounts.urls")),
]
