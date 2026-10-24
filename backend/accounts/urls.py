from django.urls import path

from .views import (
    AdminLoginAPIView,
    AdminMeAPIView,
    AdminDashboardAPIView,
)


urlpatterns = [
    path(
        "login/",
        AdminLoginAPIView.as_view(),
        name="admin-login",
    ),

    path(
        "me/",
        AdminMeAPIView.as_view(),
        name="admin-me",
    ),

    path(
        "dashboard/",
        AdminDashboardAPIView.as_view(),
        name="admin-dashboard",
    ),
]
