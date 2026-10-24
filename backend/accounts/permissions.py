from rest_framework.permissions import BasePermission


class IsAdminUserOnly(BasePermission):
    message = "Only admin users can perform this action."

    def has_permission(self, request, view):
        user = request.user

        return bool(
            hasattr(user, "is_staff")
            and user.is_authenticated
            and user.is_staff
        )


class IsAdminOrShopReadOnly(BasePermission):
    message = "Only admin users can modify this resource."

    def has_permission(self, request, view):
        # Anyone with valid authentication can read.
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return bool(
                request.user
                and getattr(request.user, "is_authenticated", False)
            )

        # Only Django admin/staff users can create/update/delete.
        user = request.user

        return bool(
            hasattr(user, "is_staff")
            and user.is_authenticated
            and user.is_staff
        )