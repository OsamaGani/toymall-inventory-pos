
from django.db.models import Exists, OuterRef

from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.filters import SearchFilter
from rest_framework.parsers import (
    MultiPartParser,
    FormParser,
    JSONParser,
)
from rest_framework.response import Response

from accounts.authentication import AdminTokenAuthentication
from accounts.permissions import IsAdminOrShopReadOnly
from shops.authentication import ShopTokenAuthentication
from shops.models import Shop
from inventory.models import ShopStock

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


# =========================================================
# CATEGORY LIST + CREATE
# =========================================================

class CategoryListCreateAPIView(generics.ListCreateAPIView):
    queryset = Category.objects.all().order_by("name")
    serializer_class = CategorySerializer

    authentication_classes = [
        ShopTokenAuthentication,
        AdminTokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAdminOrShopReadOnly,
    ]


# =========================================================
# CATEGORY DETAIL
# =========================================================

class CategoryDetailAPIView(
    generics.RetrieveUpdateDestroyAPIView
):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

    authentication_classes = [
        ShopTokenAuthentication,
        AdminTokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAdminOrShopReadOnly,
    ]


# =========================================================
# PRODUCT LIST + CREATE
# =========================================================

class ProductListCreateAPIView(
    generics.ListCreateAPIView
):
    serializer_class = ProductSerializer

    authentication_classes = [
        ShopTokenAuthentication,
        AdminTokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAdminOrShopReadOnly,
    ]

    filter_backends = [
        SearchFilter,
    ]

    search_fields = [
        "name",
        "sku",
        "barcode",
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        queryset = (
            Product.objects
            .select_related("category")
            .filter(active=True)
            .order_by("name")
        )

        # Shop POS: only products with positive stock
        # assigned to the authenticated shop.
        if isinstance(self.request.user, Shop):
            shop_stock = ShopStock.objects.filter(
                shop_id=self.request.user.id,
                product_id=OuterRef("pk"),
                quantity__gt=0,
            )

            queryset = (
                queryset
                .annotate(
                    has_stock_in_selected_shop=Exists(
                        shop_stock
                    )
                )
                .filter(
                    has_stock_in_selected_shop=True
                )
            )

        # Admin: retain access to all active products.
        return queryset


# =========================================================
# PRODUCT DETAIL
# =========================================================

class ProductDetailAPIView(
    generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ProductSerializer

    authentication_classes = [
        ShopTokenAuthentication,
        AdminTokenAuthentication,
        SessionAuthentication,
    ]

    permission_classes = [
        IsAdminOrShopReadOnly,
    ]

    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def get_queryset(self):
        queryset = (
            Product.objects
            .select_related("category")
            .all()
        )

        # Shop POS: a shop cannot retrieve a product
        # that has no positive stock in its own inventory.
        if isinstance(self.request.user, Shop):
            shop_stock = ShopStock.objects.filter(
                shop_id=self.request.user.id,
                product_id=OuterRef("pk"),
                quantity__gt=0,
            )

            queryset = (
                queryset
                .annotate(
                    has_stock_in_selected_shop=Exists(
                        shop_stock
                    )
                )
                .filter(
                    has_stock_in_selected_shop=True
                )
            )

        return queryset

    def destroy(self, request, *args, **kwargs):
        # Soft delete: retain the product record
        # for existing sales history.
        instance = self.get_object()

        instance.active = False
        instance.save(
            update_fields=["active", "updated_at"]
        )

        return Response(
            {
                "message": "Product deleted successfully."
            },
            status=status.HTTP_200_OK,
        )
