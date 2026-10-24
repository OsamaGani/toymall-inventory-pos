
from django.core import signing
from django.shortcuts import get_object_or_404

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Shop
from .serializers import (
    ShopListSerializer,
    ShopPinVerifySerializer,
)
from .authentication import ShopTokenAuthentication


SHOP_TOKEN_SALT = "toymall-shop-session"


def create_shop_token(shop):
    return signing.dumps(
        {
            "shop_id": shop.id,
        },
        salt=SHOP_TOKEN_SALT,
    )


def shop_response_data(shop):
    return {
        "id": shop.id,
        "name": shop.name,
        "shop_type": shop.shop_type,
    }


class ShopListAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        shops = Shop.objects.filter(active=True)

        serializer = ShopListSerializer(
            shops,
            many=True,
        )

        return Response(
            {
                "success": True,
                "shops": serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class ShopOpenSessionAPIView(APIView):
    """
    Create a shop session without asking for a PIN.

    WARNING:
    This endpoint does not authenticate the caller.
    Anyone who can reach it can request an active shop token.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        shop_id = request.data.get("shop_id")

        if not shop_id:
            return Response(
                {
                    "success": False,
                    "message": "Shop ID is required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        shop = get_object_or_404(
            Shop,
            id=shop_id,
            active=True,
        )

        token = create_shop_token(shop)

        return Response(
            {
                "success": True,
                "message": "Shop session opened successfully.",
                "token": token,
                "shop": shop_response_data(shop),
            },
            status=status.HTTP_200_OK,
        )


class ShopVerifyPinAPIView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = ShopPinVerifySerializer(
            data=request.data,
        )

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        shop_id = serializer.validated_data["shop_id"]
        pin = serializer.validated_data["pin"]

        shop = get_object_or_404(
            Shop,
            id=shop_id,
            active=True,
        )

        if not shop.check_shop_pin(pin):
            return Response(
                {
                    "success": False,
                    "message": "Invalid shop PIN.",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        token = create_shop_token(shop)

        return Response(
            {
                "success": True,
                "message": "Shop PIN verified successfully.",
                "token": token,
                "shop": shop_response_data(shop),
            },
            status=status.HTTP_200_OK,
        )


class ShopMeAPIView(APIView):
    authentication_classes = [
        ShopTokenAuthentication,
    ]
    permission_classes = []

    def get(self, request):
        shop = request.user

        return Response(
            {
                "success": True,
                "shop": shop_response_data(shop),
            },
            status=status.HTTP_200_OK,
        )
