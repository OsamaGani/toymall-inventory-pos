
from django.urls import path

from .views import (
    CategoryDetailAPIView,
    CategoryListCreateAPIView,
    ProductDetailAPIView,
    ProductListCreateAPIView,
    ProductImageAPIView,
)


urlpatterns = [
    # Categories
    path(
        "categories/",
        CategoryListCreateAPIView.as_view(),
        name="category-list-create",
    ),
    path(
        "categories/<int:pk>/",
        CategoryDetailAPIView.as_view(),
        name="category-detail",
    ),

    # Products
    path(
        "",
        ProductListCreateAPIView.as_view(),
        name="product-list-create",
    ),
    path(
        "<int:pk>/",
        ProductDetailAPIView.as_view(),
        name="product-detail",
    ),

    # Product image stored in PostgreSQL
    path(
        "<int:pk>/image/",
        ProductImageAPIView.as_view(),
        name="product-image",
    ),
]
