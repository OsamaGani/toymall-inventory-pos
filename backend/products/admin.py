from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "active",
        "created_at",
    )

    list_filter = (
        "active",
    )

    search_fields = (
        "name",
    )

    ordering = (
        "name",
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "sku",
        "barcode",
        "category",
        "purchase_price",
        "selling_price",
        "minimum_selling_price",
        "active",
    )

    list_filter = (
        "category",
        "active",
    )

    search_fields = (
        "name",
        "sku",
        "barcode",
    )

    list_select_related = (
        "category",
    )

    ordering = (
        "name",
    )