from django.conf import settings
from django.core.files.storage import default_storage

from rest_framework import serializers

from .models import Category, Product


# =========================================================
# CATEGORY SERIALIZER
# =========================================================

class CategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = Category

        fields = [
            "id",
            "name",
            "description",
            "active",
            "created_at",
            "updated_at",
        ]


# =========================================================
# PRODUCT SERIALIZER
# =========================================================

class ProductSerializer(serializers.ModelSerializer):

    # Actual image file uploaded from Admin UI
    image = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    # Existing database field.
    # Admin does not type this manually anymore.
    image_url = serializers.CharField(
        read_only=True,
        allow_blank=True,
        required=False,
    )

    # Category name for easy frontend display
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "name",
            "sku",
            "barcode",
            "category",
            "category_name",
            "purchase_price",
            "selling_price",
            "minimum_selling_price",
            "image",
            "image_url",
            "description",
            "active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "category_name",
            "image_url",
            "created_at",
            "updated_at",
        ]

    # =====================================================
    # CREATE PRODUCT
    # =====================================================

    def create(self, validated_data):

        uploaded_image = validated_data.pop(
            "image",
            None,
        )

        request = self.context.get("request")

        # Create product first
        product = Product.objects.create(
            **validated_data
        )

        # -------------------------------------------------
        # SAVE UPLOADED IMAGE
        # -------------------------------------------------

        if uploaded_image:

            file_path = default_storage.save(
                f"products/{uploaded_image.name}",
                uploaded_image,
            )

            if request:

                image_url = request.build_absolute_uri(
                    settings.MEDIA_URL + file_path
                )

            else:

                image_url = (
                    settings.MEDIA_URL + file_path
                )

            product.image_url = image_url

            product.save(
                update_fields=[
                    "image_url",
                    "updated_at",
                ]
            )

        return product

    # =====================================================
    # UPDATE PRODUCT
    # =====================================================

    def update(
        self,
        instance,
        validated_data,
    ):

        uploaded_image = validated_data.pop(
            "image",
            None,
        )

        request = self.context.get("request")

        # -------------------------------------------------
        # UPDATE NORMAL PRODUCT FIELDS
        # -------------------------------------------------

        for attr, value in validated_data.items():

            setattr(
                instance,
                attr,
                value,
            )

        # -------------------------------------------------
        # UPDATE IMAGE
        # -------------------------------------------------

        if uploaded_image:

            file_path = default_storage.save(
                f"products/{uploaded_image.name}",
                uploaded_image,
            )

            if request:

                instance.image_url = (
                    request.build_absolute_uri(
                        settings.MEDIA_URL + file_path
                    )
                )

            else:

                instance.image_url = (
                    settings.MEDIA_URL + file_path
                )

        instance.save()

        return instance