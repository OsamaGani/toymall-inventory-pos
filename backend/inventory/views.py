
import json

from django.db import transaction
from django.shortcuts import get_object_or_404

from rest_framework import generics, status
from rest_framework.authentication import SessionAuthentication
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import AdminTokenAuthentication
from accounts.permissions import IsAdminUserOnly

from products.models import Product
from products.serializers import ProductSerializer

from shops.authentication import ShopTokenAuthentication
from shops.models import Shop

from .models import ShopStock, StockMovement
from .serializers import (
    ShopStockSerializer,
    StockMovementSerializer,
    StockInSerializer,
)
from .services import add_stock


class ShopStockListAPIView(generics.ListAPIView):
    """Authenticated shop can view only its own stock."""

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = []
    serializer_class = ShopStockSerializer

    def get_queryset(self):
        return (
            ShopStock.objects
            .select_related("shop", "product")
            .filter(shop=self.request.user)
            .order_by("product_id")
        )


class StockMovementListAPIView(generics.ListAPIView):
    """Authenticated shop can view its own stock movements."""

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = []
    serializer_class = StockMovementSerializer

    def get_queryset(self):
        return (
            StockMovement.objects
            .select_related("shop", "product", "created_by")
            .filter(shop=self.request.user)
            .order_by("-created_at")
        )


class StockInAPIView(APIView):
    """Admin adds stock to a selected shop."""

    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAdminUserOnly]

    def post(self, request):
        serializer = StockInSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shop = get_object_or_404(
            Shop,
            id=serializer.validated_data["shop"],
            active=True,
        )

        product = get_object_or_404(
            Product,
            id=serializer.validated_data["product"],
            active=True,
        )

        try:
            stock, movement = add_stock(
                shop=shop,
                product=product,
                quantity=serializer.validated_data["quantity"],
                reference_id=serializer.validated_data.get("reference_id"),
                reference_type="STOCK_IN",
                note=serializer.validated_data.get("note"),
                created_by=request.user,
            )
        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Stock added successfully.",
                "stock": {
                    "id": stock.id,
                    "shop": shop.name,
                    "product": product.name,
                    "quantity": stock.quantity,
                },
                "movement_id": movement.id,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminMultiShopProductCreateAPIView(APIView):
    """Create one product and assign opening stock to selected shops."""

    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAdminUserOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        raw_shop_stocks = request.data.get("shop_stocks", "[]")

        try:
            shop_stocks = (
                json.loads(raw_shop_stocks)
                if isinstance(raw_shop_stocks, str)
                else raw_shop_stocks
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "shop_stocks must be a valid JSON list.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(shop_stocks, list) or not shop_stocks:
            return Response(
                {
                    "success": False,
                    "message": "Select at least one shop.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        seen_shop_ids = set()
        normalized_stocks = []

        for item in shop_stocks:
            if not isinstance(item, dict):
                return Response(
                    {
                        "success": False,
                        "message": "Each shop entry must be an object.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                shop_id = int(item.get("shop_id", item.get("shop")))
                quantity = int(item.get("quantity"))
            except (TypeError, ValueError):
                return Response(
                    {
                        "success": False,
                        "message": "Each shop needs a valid ID and quantity.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if quantity < 0:
                return Response(
                    {
                        "success": False,
                        "message": "Stock quantity cannot be negative.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if shop_id in seen_shop_ids:
                return Response(
                    {
                        "success": False,
                        "message": "A shop can only be selected once.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seen_shop_ids.add(shop_id)
            normalized_stocks.append(
                {"shop_id": shop_id, "quantity": quantity}
            )

        shops_by_id = {
            shop.id: shop
            for shop in Shop.objects.filter(
                id__in=seen_shop_ids,
                active=True,
            )
        }

        if len(shops_by_id) != len(seen_shop_ids):
            return Response(
                {
                    "success": False,
                    "message": (
                        "One or more selected shops do not exist or are inactive."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        product_data = request.data.copy()
        product_data.pop("shop_stocks", None)

        serializer = ProductSerializer(
            data=product_data,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                product = serializer.save()
                stock_results = []

                for item in normalized_stocks:
                    shop = shops_by_id[item["shop_id"]]
                    quantity = item["quantity"]

                    if quantity > 0:
                        stock, movement = add_stock(
                            shop=shop,
                            product=product,
                            quantity=quantity,
                            reference_type="INITIAL_STOCK",
                            note="Initial stock added during product creation.",
                            created_by=request.user,
                        )
                    else:
                        stock, created = ShopStock.objects.get_or_create(
                            shop=shop,
                            product=product,
                            defaults={"quantity": 0},
                        )

                    stock_results.append(
                        {
                            "shop_id": shop.id,
                            "shop_name": shop.name,
                            "quantity": stock.quantity,
                        }
                    )

        except ValueError as exc:
            return Response(
                {"success": False, "message": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Product created and assigned to selected shops.",
                "product": ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
                "shop_stocks": stock_results,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminProductDetailAPIView(APIView):
    """
    Admin can retrieve, edit, or deactivate a product.

    DELETE uses soft deletion (active=False) to help preserve
    historical sales and stock movement records.
    """

    authentication_classes = [
        AdminTokenAuthentication,
        SessionAuthentication,
    ]
    permission_classes = [IsAdminUserOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_product(self, product_id):
        return get_object_or_404(Product, pk=product_id)

    def get(self, request, product_id):
        product = self.get_product(product_id)

        return Response(
            {
                "success": True,
                "product": ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request, product_id):
        product = self.get_product(product_id)

        serializer = ProductSerializer(
            product,
            data=request.data,
            partial=True,
            context={"request": request},
        )

        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product = serializer.save()

        return Response(
            {
                "success": True,
                "message": "Product updated successfully.",
                "product": ProductSerializer(
                    product,
                    context={"request": request},
                ).data,
            },
            status=status.HTTP_200_OK,
        )

    def delete(self, request, product_id):
        product = self.get_product(product_id)

        if not product.active:
            return Response(
                {
                    "success": True,
                    "message": "Product is already inactive.",
                },
                status=status.HTTP_200_OK,
            )

        product.active = False
        product.save(update_fields=["active"])

        return Response(
            {
                "success": True,
                "message": (
                    "Product deactivated. Historical sales and stock "
                    "records have been preserved."
                ),
            },
            status=status.HTTP_200_OK,
        )
