from django.urls import include, path

urlpatterns = [path("", include("apps.governance.urls"))]
