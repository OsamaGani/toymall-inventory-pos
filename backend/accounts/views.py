
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import authenticate, get_user_model
from django.core import signing
from django.db import transaction
from django.db.models import Count, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from accounts.authentication import (
    ADMIN_TOKEN_SALT,
    ADMIN_TOKEN_MAX_AGE,
    AdminTokenAuthentication,
)
from accounts.permissions import IsAdminUserOnly

from products.models import Product
from shops.models import Shop
from inventory.models import ShopStock
from sales.models import Sale, SaleItem


User = get_user_model()


class AdminLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = str(request.data.get("username", "")).strip()
        password = str(request.data.get("password", ""))

        if not username or not password:
            return Response(
                {
                    "success": False,
                    "message": "Username and password are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(
            request=request,
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {
                    "success": False,
                    "message": "Invalid username or password.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.is_active:
            return Response(
                {
                    "success": False,
                    "message": "This admin account is inactive.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not user.is_staff:
            return Response(
                {
                    "success": False,
                    "message": "You are not authorized as an admin.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        token = signing.dumps(
            user.id,
            salt=ADMIN_TOKEN_SALT,
        )

        return Response(
            {
                "success": True,
                "message": "Admin login successful.",
                "token": token,
                "admin": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
                "expires_in": ADMIN_TOKEN_MAX_AGE,
            },
            status=status.HTTP_200_OK,
        )


class AdminMeAPIView(APIView):
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        user = request.user

        return Response(
            {
                "success": True,
                "admin": {
                    "id": user.id,
                    "username": user.username,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                },
            },
            status=status.HTTP_200_OK,
        )


class AdminDashboardAPIView(APIView):
    authentication_classes = [AdminTokenAuthentication]
    permission_classes = [IsAdminUserOnly]

    def get(self, request):
        # 1. Selected shop
        shop_id = request.query_params.get("shop_id")

        if not shop_id:
            return Response(
                {
                    "success": False,
                    "message": "Please select a shop.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            selected_shop = Shop.objects.get(
                id=int(shop_id),
                active=True,
            )
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid shop ID.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Shop.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Shop not found or inactive.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Date filter
        today = timezone.localdate()

        date_from_text = request.query_params.get(
            "date_from", str(today)
        )
        date_to_text = request.query_params.get(
            "date_to", str(today)
        )

        try:
            start_date = date.fromisoformat(date_from_text)
            end_date = date.fromisoformat(date_to_text)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": "Invalid date. Use YYYY-MM-DD format.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {
                    "success": False,
                    "message": "From date cannot be after To date.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        start_datetime = timezone.make_aware(
            datetime.combine(start_date, time.min)
        )
        end_datetime = timezone.make_aware(
            datetime.combine(
                end_date + timedelta(days=1),
                time.min,
            )
        )

        # 3. Selected shop sales for the chosen date range
        shop_sales = Sale.objects.filter(
            shop_id=selected_shop.id
        )

        filtered_sales = shop_sales.filter(
            created_at__gte=start_datetime,
            created_at__lt=end_datetime,
        )

        filtered_summary = filtered_sales.aggregate(
            revenue=Coalesce(
                Sum("total"),
                Value(Decimal("0.00")),
            ),
            sales_count=Count("id"),
        )

        filtered_revenue = (
            filtered_summary["revenue"] or Decimal("0.00")
        )
        filtered_sales_count = filtered_summary["sales_count"] or 0

        filtered_items_sold = (
            SaleItem.objects.filter(
                sale__in=filtered_sales
            ).aggregate(
                total=Coalesce(Sum("quantity"), Value(0))
            )["total"] or 0
        )

        # 4. All-time sales for this shop
        all_time_summary = shop_sales.aggregate(
            revenue=Coalesce(
                Sum("total"),
                Value(Decimal("0.00")),
            ),
            sales_count=Count("id"),
        )

        all_time_revenue = (
            all_time_summary["revenue"] or Decimal("0.00")
        )
        all_time_sales_count = (
            all_time_summary["sales_count"] or 0
        )

        all_time_items_sold = (
            SaleItem.objects.filter(
                sale__shop_id=selected_shop.id
            ).aggregate(
                total=Coalesce(Sum("quantity"), Value(0))
            )["total"] or 0
        )

        # 5. All active products with stock for this shop
        # Products without a stock record are also displayed as zero.
        active_products = Product.objects.filter(
            active=True
        ).order_by("name")

        stock_queryset = ShopStock.objects.filter(
            shop_id=selected_shop.id
        ).select_related("product")

        stock_by_product = {
            stock.product_id: stock
            for stock in stock_queryset
        }

        product_list = []

        for product in active_products:
            stock_record = stock_by_product.get(product.id)

            product_list.append(
                {
                    "id": product.id,
                    "product_id": product.id,
                    "name": product.name,
                    "product_name": product.name,
                    "sku": getattr(product, "sku", "") or "",
                    "quantity": (
                        stock_record.quantity if stock_record else 0
                    ),
                    "stock_record_exists": stock_record is not None,
                }
            )

        # 6. Stock summary
        total_stock_units = sum(
            item["quantity"] for item in product_list
        )

        out_of_stock_items = sum(
            1 for item in product_list
            if item["quantity"] == 0
        )

        low_stock_items = sum(
            1 for item in product_list
            if 0 < item["quantity"] <= 5
        )

        total_products_count = len(product_list)
        active_products_count = total_products_count

        # 7. Retail vs wholesale for selected date range
        sale_type_rows = filtered_sales.values(
            "sale_type"
        ).annotate(
            sales_count=Count("id"),
            revenue=Coalesce(
                Sum("total"),
                Value(Decimal("0.00")),
            ),
        )

        sale_type_map = {
            row["sale_type"]: row
            for row in sale_type_rows
        }

        sale_type_sales = []

        for sale_type in ("RETAIL", "WHOLESALE"):
            row = sale_type_map.get(sale_type, {})

            sale_type_sales.append(
                {
                    "sale_type": sale_type,
                    "sales_count": row.get("sales_count", 0) or 0,
                    "revenue": str(
                        row.get("revenue", Decimal("0.00"))
                        or Decimal("0.00")
                    ),
                }
            )

        # 8. Payment summary for selected date range
        payment_rows = filtered_sales.values(
            "payment_method"
        ).annotate(
            sales_count=Count("id"),
            revenue=Coalesce(
                Sum("total"),
                Value(Decimal("0.00")),
            ),
        ).order_by("payment_method")

        payment_summary = [
            {
                "payment_method": row["payment_method"],
                "sales_count": row["sales_count"] or 0,
                "revenue": str(
                    row["revenue"] or Decimal("0.00")
                ),
            }
            for row in payment_rows
        ]

        # 9. POS bills for selected date range
        recent_sales_queryset = (
            filtered_sales.select_related("shop")
            .order_by("-created_at")[:100]
        )

        recent_sales = []

        for sale in recent_sales_queryset:
            recent_sales.append(
                {
                    "id": sale.id,
                    "invoice_number": sale.invoice_number,
                    "shop_id": sale.shop_id,
                    "shop_name": sale.shop.name,
                    "sale_type": sale.sale_type,
                    "payment_method": sale.payment_method,
                    "subtotal": str(sale.subtotal),
                    "discount": str(sale.discount),
                    "total": str(sale.total),
                    "created_at": sale.created_at,
                }
            )

        # 10. Product-wise sold line details for the selected date range.
        # Each row represents one product line on a POS sale/invoice.
        sold_items_queryset = (
            SaleItem.objects
            .filter(sale__in=filtered_sales)
            .select_related("product", "sale")
            .order_by("-sale__created_at", "product__name")
        )

        sold_items = []
        for sale_item in sold_items_queryset:
            sold_product = getattr(sale_item, "product", None)
            sold_sale = sale_item.sale
            sold_items.append(
                {
                    "sale_id": sold_sale.id,
                    "invoice_number": sold_sale.invoice_number,
                    "created_at": sold_sale.created_at,
                    "product_id": getattr(sale_item, "product_id", None),
                    "product_name": getattr(sold_product, "name", "Unknown product"),
                    "sku": getattr(sold_product, "sku", "") or "",
                    "quantity_sold": sale_item.quantity,
                }
            )

        # 11. Dashboard response
        return Response(
            {
                "success": True,
                "dashboard": {
                    "date": str(today),
                    "date_from": str(start_date),
                    "date_to": str(end_date),

                    "shop": {
                        "id": selected_shop.id,
                        "name": selected_shop.name,
                        "shop_type": selected_shop.shop_type,
                    },

                    "today": {
                        "revenue": str(filtered_revenue),
                        "sales_count": filtered_sales_count,
                        "invoice_count": filtered_sales_count,
                        "items_sold": filtered_items_sold,
                    },

                    "all_time": {
                        "revenue": str(all_time_revenue),
                        "sales_count": all_time_sales_count,
                        "items_sold": all_time_items_sold,
                    },

                    "products": {
                        "active_count": active_products_count,
                        "total_count": total_products_count,
                        "items": product_list,
                    },

                    "stock": {
                        "total_units": total_stock_units,
                        "total_stock_records": len(stock_by_product),
                        "out_of_stock_items": out_of_stock_items,
                        "low_stock_items": low_stock_items,
                    },

                    "shop_sales": [
                        {
                            "shop_id": selected_shop.id,
                            "shop_name": selected_shop.name,
                            "shop_type": selected_shop.shop_type,
                            "sales_count": filtered_sales_count,
                            "revenue": str(filtered_revenue),
                        }
                    ],

                    "sale_type_sales": sale_type_sales,
                    "payment_summary": payment_summary,
                    "recent_sales": recent_sales,
                    "sold_items": sold_items,
                },
            },
            status=status.HTTP_200_OK,
        )

    def patch(self, request):
        # 11. Edit or add stock from the admin dashboard
        shop_id = request.data.get("shop_id")
        product_id = request.data.get("product_id")
        action = request.data.get("action", "set")
        quantity = request.data.get("quantity")

        try:
            shop_id = int(shop_id)
            product_id = int(product_id)
            quantity = int(quantity)
        except (TypeError, ValueError):
            return Response(
                {
                    "success": False,
                    "message": (
                        "Shop ID, product ID and valid quantity are required."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if quantity < 0:
            return Response(
                {
                    "success": False,
                    "message": "Quantity cannot be negative.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if action not in ("set", "add"):
            return Response(
                {
                    "success": False,
                    "message": "Action must be set or add.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            shop = Shop.objects.get(
                id=shop_id,
                active=True,
            )
        except Shop.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Shop not found or inactive.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            product = Product.objects.get(
                id=product_id,
                active=True,
            )
        except Product.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "Active product not found.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            stock, created = ShopStock.objects.get_or_create(
                shop=shop,
                product=product,
                defaults={"quantity": 0},
            )

            if action == "add":
                stock.quantity += quantity
            else:
                stock.quantity = quantity

            stock.save()

        return Response(
            {
                "success": True,
                "message": "Stock updated successfully.",
                "shop_id": shop.id,
                "product_id": product.id,
                "product_name": product.name,
                "quantity": stock.quantity,
            },
            status=status.HTTP_200_OK,
        )
