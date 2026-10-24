from django.contrib.auth import get_user_model
from django.core import signing
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed


User = get_user_model()

ADMIN_TOKEN_SALT = "toymall-admin-session"
ADMIN_TOKEN_MAX_AGE = 8 * 60 * 60  # 8 hours


class AdminTokenAuthentication(authentication.BaseAuthentication):

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return None

        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise AuthenticationFailed("Invalid authorization header.")

        token = parts[1]

        try:
            user_id = signing.loads(
                token,
                salt=ADMIN_TOKEN_SALT,
                max_age=ADMIN_TOKEN_MAX_AGE,
            )
        except signing.BadSignature:
            raise AuthenticationFailed("Invalid or expired admin token.")
        except signing.SignatureExpired:
            raise AuthenticationFailed("Admin session has expired.")

        try:
            user = User.objects.get(
                id=user_id,
                is_active=True,
                is_staff=True,
            )
        except User.DoesNotExist:
            raise AuthenticationFailed("Admin user not found.")

        return user, token