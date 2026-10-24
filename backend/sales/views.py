from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shops.authentication import ShopTokenAuthentication

from .models import Sale
from .serializers import SaleCreateSerializer, SaleSerializer
from .services import create_sale


class SaleCreateAPIView(APIView):
    """
    Create a sale for the currently authenticated shop.

    The shop is taken from the authenticated shop token.
    The client cannot provide or override shop_id.
    """

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SaleCreateSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                {
                    "success": False,
                    "errors": serializer.errors,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            sale = create_sale(
                shop=request.user,
                sale_type=serializer.validated_data["sale_type"],
                payment_method=serializer.validated_data["payment_method"],
                items=serializer.validated_data["items"],
                discount=serializer.validated_data["discount"],
                created_by=None,
            )

        except ValueError as exc:
            return Response(
                {
                    "success": False,
                    "message": str(exc),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "success": True,
                "message": "Sale created successfully.",
                "sale": SaleSerializer(sale).data,
            },
            status=status.HTTP_201_CREATED,
        )


class SaleListAPIView(generics.ListAPIView):
    """
    Returns only sales belonging to the authenticated shop.
    """

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = SaleSerializer

    def get_queryset(self):
        shop = self.request.user

        return (
            Sale.objects
            .select_related("shop")
            .prefetch_related("items__product")
            .filter(shop=shop)
            .order_by("-created_at")
        )


class SaleDetailAPIView(generics.RetrieveAPIView):
    """
    Returns a sale only if it belongs to the authenticated shop.
    """

    authentication_classes = [ShopTokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = SaleSerializer

    def get_queryset(self):
        shop = self.request.user

        return (
            Sale.objects
            .select_related("shop")
            .prefetch_related("items__product")
            .filter(shop=shop)
        )