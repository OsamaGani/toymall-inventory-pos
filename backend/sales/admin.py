from django.contrib import admin

from .models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    readonly_fields = (
        "line_total",
        "created_at",
    )


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "invoice_number",
        "shop",
        "sale_type",
        "subtotal",
        "discount",
        "total",
        "payment_method",
        "created_by",
        "created_at",
    )

    list_filter = (
        "shop",
        "sale_type",
        "payment_method",
        "created_at",
    )

    search_fields = (
        "invoice_number",
        "shop__name",
    )

    list_select_related = (
        "shop",
        "created_by",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    inlines = [
        SaleItemInline,
    ]

    ordering = (
        "-created_at",
    )


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sale",
        "product",
        "quantity",
        "regular_price",
        "actual_sale_price",
        "discount",
        "line_total",
        "created_at",
    )

    list_filter = (
        "created_at",
    )

    search_fields = (
        "sale__invoice_number",
        "product__name",
        "product__sku",
        "product__barcode",
    )

    list_select_related = (
        "sale",
        "product",
    )

    readonly_fields = (
        "line_total",
        "created_at",
    )

    ordering = (
        "-created_at",
    )