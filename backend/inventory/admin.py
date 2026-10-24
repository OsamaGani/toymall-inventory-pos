from django.contrib import admin

from .models import ShopStock, StockMovement


@admin.register(ShopStock)
class ShopStockAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "shop",
        "product",
        "quantity",
        "updated_at",
    )

    list_filter = (
        "shop",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "product__barcode",
        "shop__name",
    )

    list_select_related = (
        "shop",
        "product",
    )

    ordering = (
        "shop",
        "product",
    )


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "shop",
        "product",
        "movement_type",
        "quantity",
        "reference_type",
        "reference_id",
        "created_by",
        "created_at",
    )

    list_filter = (
        "shop",
        "movement_type",
        "created_at",
    )

    search_fields = (
        "product__name",
        "product__sku",
        "product__barcode",
        "shop__name",
        "reference_id",
    )

    list_select_related = (
        "shop",
        "product",
        "created_by",
    )

    ordering = (
        "-created_at",
    )

    readonly_fields = (
        "created_at",
    )