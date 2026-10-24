from django.urls import path

from .views import (
    InvoiceListAPIView,
    InvoiceDetailAPIView,
)


urlpatterns = [
    path(
        "",
        InvoiceListAPIView.as_view(),
        name="invoice-list",
    ),

    path(
        "<int:pk>/",
        InvoiceDetailAPIView.as_view(),
        name="invoice-detail",
    ),
]