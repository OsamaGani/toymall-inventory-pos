from django.contrib import admin

from .models import Invoice


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "invoice_number",
        "sale",
        "shop",
        "generated_at",
        "created_at",
    )

    list_filter = (
        "shop",
        "generated_at",
    )

    search_fields = (
        "invoice_number",
        "sale__invoice_number",
        "shop__name",
    )

    list_select_related = (
        "sale",
        "shop",
    )

    readonly_fields = (
        "generated_at",
        "created_at",
        "updated_at",
    )

    ordering = (
        "-generated_at",
    )