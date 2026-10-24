from rest_framework import serializers

from sales.models import Sale, SaleItem
from .models import Invoice


class InvoiceItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    sku = serializers.CharField(
        source="product.sku",
        read_only=True,
    )

    barcode = serializers.CharField(
        source="product.barcode",
        read_only=True,
    )

    class Meta:
        model = SaleItem
        fields = (
            "id",
            "product",
            "product_name",
            "sku",
            "barcode",
            "quantity",
            "regular_price",
            "actual_sale_price",
            "discount",
            "line_total",
        )


class InvoiceSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(
        source="shop.name",
        read_only=True,
    )

    sale_type = serializers.CharField(
        source="sale.sale_type",
        read_only=True,
    )

    subtotal = serializers.DecimalField(
        source="sale.subtotal",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    discount = serializers.DecimalField(
        source="sale.discount",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    total = serializers.DecimalField(
        source="sale.total",
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )

    payment_method = serializers.CharField(
        source="sale.payment_method",
        read_only=True,
    )

    items = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = (
            "id",
            "invoice_number",
            "shop",
            "shop_name",
            "sale_type",
            "subtotal",
            "discount",
            "total",
            "payment_method",
            "items",
            "generated_at",
        )

    def get_items(self, obj):
        return InvoiceItemSerializer(
            obj.sale.items.all(),
            many=True,
        ).data