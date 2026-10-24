from decimal import Decimal

from rest_framework import serializers

from products.models import Product
from .models import Sale


class SaleItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    actual_sale_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
    )


class SaleCreateSerializer(serializers.Serializer):
    sale_type = serializers.ChoiceField(
        choices=Sale.SALE_TYPE_CHOICES
    )

    payment_method = serializers.ChoiceField(
        choices=Sale.PAYMENT_METHOD_CHOICES
    )

    discount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.00"),
        required=False,
        default=Decimal("0.00"),
    )

    items = SaleItemInputSerializer(
        many=True,
        allow_empty=False
    )

    def validate_items(self, value):
        product_ids = [item["product"] for item in value]

        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError(
                "Duplicate products are not allowed in the same sale."
            )

        products = Product.objects.filter(
            id__in=product_ids,
            active=True
        )

        product_map = {
            product.id: product
            for product in products
        }

        missing_products = [
            product_id
            for product_id in product_ids
            if product_id not in product_map
        ]

        if missing_products:
            raise serializers.ValidationError(
                f"Product not found or inactive: {missing_products}"
            )

        for item in value:
            item["product"] = product_map[item["product"]]

        return value


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True
    )

    sku = serializers.CharField(
        source="product.sku",
        read_only=True
    )

    barcode = serializers.CharField(
        source="product.barcode",
        read_only=True
    )

    class Meta:
        from .models import SaleItem

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


class SaleSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(
        source="shop.name",
        read_only=True
    )

    items = SaleItemSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Sale

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
            "created_at",
        )

        read_only_fields = (
            "id",
            "invoice_number",
            "shop",
            "shop_name",
            "subtotal",
            "total",
            "items",
            "created_at",
        )