from rest_framework import serializers

from .models import ShopStock, StockMovement


class ShopStockSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(
        source="shop.name",
        read_only=True,
    )

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
        model = ShopStock
        fields = (
            "id",
            "shop",
            "shop_name",
            "product",
            "product_name",
            "sku",
            "barcode",
            "quantity",
            "created_at",
            "updated_at",
        )

        read_only_fields = (
            "id",
            "shop_name",
            "product_name",
            "sku",
            "barcode",
            "created_at",
            "updated_at",
        )


class StockMovementSerializer(serializers.ModelSerializer):
    shop_name = serializers.CharField(
        source="shop.name",
        read_only=True,
    )

    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = (
            "id",
            "shop",
            "shop_name",
            "product",
            "product_name",
            "movement_type",
            "quantity",
            "reference_id",
            "reference_type",
            "note",
            "created_by",
            "created_at",
        )

        read_only_fields = (
            "id",
            "shop_name",
            "product_name",
            "created_by",
            "created_at",
        )
class StockInSerializer(serializers.Serializer):
    shop = serializers.IntegerField()
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    reference_id = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    note = serializers.CharField(
        required=False,
        allow_blank=True,
    )