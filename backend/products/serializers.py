
from django.conf import settings

import cloudinary
import cloudinary.uploader

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

    # Actual image file uploaded from Admin UI
    image = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
    )

    # Image URL stored in the database
    image_url = serializers.CharField(
        read_only=True,
        allow_blank=True,
        required=False,
    )

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
    # UPLOAD PRODUCT IMAGE TO CLOUDINARY
    # =====================================================

    def upload_product_image(self, uploaded_image):

        if not settings.CLOUDINARY_STORAGE_CONFIGURED:
            raise serializers.ValidationError({
                "image": "Cloudinary credentials are not configured."
            })

        # Configure Cloudinary using settings.py credentials
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

        result = cloudinary.uploader.upload(
            uploaded_image,
            folder="toymall/products",
            resource_type="image",
        )

        image_url = result.get("secure_url")

        if not image_url:
            raise serializers.ValidationError({
                "image": "Cloudinary did not return an image URL."
            })

        return image_url

    # =====================================================
    # CREATE PRODUCT
    # =====================================================

    def create(self, validated_data):

        uploaded_image = validated_data.pop(
            "image",
            None,
        )

        # Upload image if provided
        if uploaded_image:
            validated_data["image_url"] = (
                self.upload_product_image(uploaded_image)
            )

        # Create product with its Cloudinary image URL
        product = Product.objects.create(
            **validated_data
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

        # Update image only when a new image is uploaded
        if uploaded_image:
            instance.image_url = (
                self.upload_product_image(uploaded_image)
            )

        # Update normal product fields
        for attr, value in validated_data.items():
            setattr(
                instance,
                attr,
                value,
            )

        instance.save()

        return instance
