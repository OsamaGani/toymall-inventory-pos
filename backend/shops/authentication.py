from django.core import signing
from rest_framework import authentication
from rest_framework import exceptions

from .models import Shop


SHOP_TOKEN_SALT = "toymall-shop-session"


class ShopTokenAuthentication(authentication.BaseAuthentication):
    """
    Authenticate a request using the signed ToyMall shop token.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise exceptions.AuthenticationFailed(
                "Invalid authorization header."
            )

        token = parts[1]

        try:
            payload = signing.loads(
                token,
                salt=SHOP_TOKEN_SALT,
                max_age=60 * 60 * 8,
            )
        except signing.BadSignature:
            raise exceptions.AuthenticationFailed(
                "Invalid or expired shop token."
            )

        shop_id = payload.get("shop_id")

        if not shop_id:
            raise exceptions.AuthenticationFailed(
                "Invalid shop token."
            )

        try:
            shop = Shop.objects.get(
                id=shop_id,
                active=True,
            )
        except Shop.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                "Shop not found or inactive."
            )

        return (shop, token)