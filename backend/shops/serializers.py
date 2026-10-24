from rest_framework import serializers

from .models import Shop


class ShopListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = (
            "id",
            "name",
            "shop_type",
        )


class ShopPinVerifySerializer(serializers.Serializer):
    shop_id = serializers.IntegerField()
    pin = serializers.CharField(
        write_only=True,
        min_length=4,
        max_length=20,
    )

    def validate_shop_id(self, value):
        try:
            shop = Shop.objects.get(
                id=value,
                active=True,
            )
        except Shop.DoesNotExist:
            raise serializers.ValidationError(
                "Shop not found or inactive."
            )

        return value