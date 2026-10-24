
from django.urls import path

from .views import (
    ShopStockListAPIView,
    StockMovementListAPIView,
    StockInAPIView,
    AdminMultiShopProductCreateAPIView,
    AdminProductDetailAPIView,
)


urlpatterns = [
    path(
        "stock/",
        ShopStockListAPIView.as_view(),
        name="shop-stock-list",
    ),
    path(
        "movements/",
        StockMovementListAPIView.as_view(),
        name="stock-movement-list",
    ),
    path(
        "stock-in/",
        StockInAPIView.as_view(),
        name="stock-in",
    ),
    path(
        "admin/products/create/",
        AdminMultiShopProductCreateAPIView.as_view(),
        name="admin-multi-shop-product-create",
    ),
    path(
        "admin/products/<int:product_id>/",
        AdminProductDetailAPIView.as_view(),
        name="admin-product-detail",
    ),
]
