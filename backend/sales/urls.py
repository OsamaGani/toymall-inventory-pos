from django.urls import path

from .views import (
    SaleCreateAPIView,
    SaleListAPIView,
    SaleDetailAPIView,
)


urlpatterns = [
    path(
        "",
        SaleListAPIView.as_view(),
        name="sale-list",
    ),

    path(
        "create/",
        SaleCreateAPIView.as_view(),
        name="sale-create",
    ),

    path(
        "<int:pk>/",
        SaleDetailAPIView.as_view(),
        name="sale-detail",
    ),
]