
from django.urls import reverse

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

    # Category is optional
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
    )

    # Image uploaded from the admin form
    image = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    # URL for displaying the image stored in PostgreSQL
    image_url = serializers.SerializerMethodField()

    # Category name for frontend display
    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
        allow_null=True,
        default=None,
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
    # IMAGE URL
    # =====================================================

    def get_image_url(self, obj):
        # Return the endpoint for a PostgreSQL-stored image.
        if obj.image_data:
            request = self.context.get("request")

            image_path = reverse(
                "product-image",
                kwargs={"pk": obj.pk},
            )

            if request is not None:
                return request.build_absolute_uri(image_path)

            return image_path

        # Preserve legacy image URLs for existing products.
        return obj.image_url or ""

    # =====================================================
    # SAVE IMAGE DATA IN POSTGRESQL
    # =====================================================

    def save_product_image(self, product, uploaded_image):
        product.image_data = uploaded_image.read()

        product.image_content_type = (
            getattr(uploaded_image, "content_type", None)
            or "application/octet-stream"
        )

        # New uploads use PostgreSQL, not an external image URL.
        product.image_url = None

    # =====================================================
    # CREATE PRODUCT
    # =====================================================

    def create(self, validated_data):
        uploaded_image = validated_data.pop("image", None)

        product = Product(**validated_data)

        if uploaded_image is not None:
            self.save_product_image(product, uploaded_image)

        product.save()

        return product

    # =====================================================
    # UPDATE PRODUCT
    # =====================================================

    def update(self, instance, validated_data):
        uploaded_image = validated_data.pop("image", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Keep the existing image if no new image is uploaded.
        if uploaded_image is not None:
            self.save_product_image(instance, uploaded_image)

        instance.save()

        return instance
