from decimal import Decimal

from django.db import transaction
from django.db.models import F

from inventory.models import ShopStock, StockMovement
from invoices.models import Invoice

from .models import InvoiceCounter, Sale, SaleItem


@transaction.atomic
def create_sale(
    *,
    shop,
    sale_type,
    payment_method,
    items,
    discount=Decimal("0.00"),
    created_by=None,
):
    """
    Creates a complete sale transaction.

    The following operations happen inside one database transaction:

    1. Validate sale data
    2. Lock shop stock rows
    3. Generate a concurrency-safe invoice number
    4. Create Sale
    5. Create SaleItems
    6. Deduct stock
    7. Create StockMovement records
    8. Create Invoice

    If any operation fails, the entire transaction is rolled back.
    """

    # ---------------------------------------------------------
    # Basic validation
    # ---------------------------------------------------------

    if not items:
        raise ValueError(
            "Sale must contain at least one item."
        )

    discount = Decimal(str(discount))

    if discount < Decimal("0.00"):
        raise ValueError(
            "Discount cannot be negative."
        )

    # ---------------------------------------------------------
    # Validate sale type against shop type
    # ---------------------------------------------------------

    if sale_type == Sale.RETAIL:
        if shop.shop_type != "RETAIL":
            raise ValueError(
                "Retail sale can only be created from a retail shop."
            )

    elif sale_type == Sale.WHOLESALE:
        if shop.shop_type != "WHOLESALE":
            raise ValueError(
                "Wholesale sale can only be created from the wholesale shop."
            )

    else:
        raise ValueError(
            "Invalid sale type."
        )

    # ---------------------------------------------------------
    # Prepare sale items
    # ---------------------------------------------------------

    subtotal = Decimal("0.00")
    prepared_items = []

    for item in items:
        product = item["product"]

        quantity = int(
            item["quantity"]
        )

        actual_sale_price = Decimal(
            str(item["actual_sale_price"])
        )

        # -----------------------------------------------------
        # Quantity validation
        # -----------------------------------------------------

        if quantity <= 0:
            raise ValueError(
                "Quantity must be greater than zero."
            )

        # -----------------------------------------------------
        # Sale price validation
        # -----------------------------------------------------

        if actual_sale_price < Decimal("0.00"):
            raise ValueError(
                "Sale price cannot be negative."
            )

        # -----------------------------------------------------
        # Product active validation
        # -----------------------------------------------------

        if not product.active:
            raise ValueError(
                f"Product {product.name} is inactive."
            )

        # -----------------------------------------------------
        # Minimum selling price validation
        # -----------------------------------------------------

        if (
            product.minimum_selling_price is not None
            and actual_sale_price < product.minimum_selling_price
        ):
            raise ValueError(
                f"Sale price for {product.name} cannot be below "
                f"minimum selling price "
                f"{product.minimum_selling_price}."
            )

        # -----------------------------------------------------
        # Lock stock row
        # -----------------------------------------------------

        stock = (
            ShopStock.objects
            .select_for_update()
            .filter(
                shop=shop,
                product=product,
            )
            .first()
        )

        if not stock:
            raise ValueError(
                f"No stock record found for {product.name} "
                f"in this shop."
            )

        # -----------------------------------------------------
        # Stock validation
        # -----------------------------------------------------

        if stock.quantity < quantity:
            raise ValueError(
                f"Insufficient stock for {product.name}. "
                f"Available stock: {stock.quantity}."
            )

        # -----------------------------------------------------
        # Preserve Product Master selling price
        # -----------------------------------------------------

        regular_price = product.selling_price

        # -----------------------------------------------------
        # Actual sale price can change because of bargaining
        # -----------------------------------------------------

        line_total = (
            actual_sale_price * quantity
        )

        subtotal += line_total

        prepared_items.append(
            {
                "product": product,
                "quantity": quantity,
                "regular_price": regular_price,
                "actual_sale_price": actual_sale_price,
                "line_total": line_total,
            }
        )

    # ---------------------------------------------------------
    # Discount validation
    # ---------------------------------------------------------

    if discount > subtotal:
        raise ValueError(
            "Discount cannot be greater than subtotal."
        )

    total = subtotal - discount

    if total < Decimal("0.00"):
        total = Decimal("0.00")

    # ---------------------------------------------------------
    # Generate concurrency-safe invoice number
    # ---------------------------------------------------------

    invoice_number = generate_invoice_number()

    # ---------------------------------------------------------
    # Create Sale
    # ---------------------------------------------------------

    sale = Sale.objects.create(
        invoice_number=invoice_number,
        shop=shop,
        sale_type=sale_type,
        subtotal=subtotal,
        discount=discount,
        total=total,
        payment_method=payment_method,
        created_by=created_by,
    )

    # ---------------------------------------------------------
    # Create Sale Items + Deduct Stock + Movement
    # ---------------------------------------------------------

    for item in prepared_items:

        SaleItem.objects.create(
            sale=sale,
            product=item["product"],
            quantity=item["quantity"],
            regular_price=item["regular_price"],
            actual_sale_price=item["actual_sale_price"],
            discount=Decimal("0.00"),
            line_total=item["line_total"],
        )

        # -----------------------------------------------------
        # Lock stock row again before deduction
        # -----------------------------------------------------

        stock = (
            ShopStock.objects
            .select_for_update()
            .get(
                shop=shop,
                product=item["product"],
            )
        )

        # -----------------------------------------------------
        # Final concurrency-safe stock check
        # -----------------------------------------------------

        if stock.quantity < item["quantity"]:
            raise ValueError(
                f"Insufficient stock for "
                f"{item['product'].name}. "
                f"Available stock: {stock.quantity}."
            )

        # -----------------------------------------------------
        # Deduct stock
        # -----------------------------------------------------

        stock.quantity = (
            F("quantity") - item["quantity"]
        )

        stock.save(
            update_fields=[
                "quantity",
                "updated_at",
            ]
        )

        # -----------------------------------------------------
        # Refresh actual quantity from database
        # -----------------------------------------------------

        stock.refresh_from_db()

        # -----------------------------------------------------
        # Create stock movement
        # -----------------------------------------------------

        StockMovement.objects.create(
            shop=shop,
            product=item["product"],
            movement_type=StockMovement.SALE,
            quantity=item["quantity"],
            reference_id=invoice_number,
            reference_type="SALE",
            note=f"Sale {invoice_number}",
            created_by=created_by,
        )

    # ---------------------------------------------------------
    # Create Invoice
    # ---------------------------------------------------------

    Invoice.objects.create(
        invoice_number=invoice_number,
        sale=sale,
        shop=shop,
    )

    return sale


def generate_invoice_number():
    """
    Generates a concurrency-safe ToyMall invoice number.

    Format:

        TM-000001
        TM-000002
        TM-000003
        ...
    """

    counter = (
        InvoiceCounter.objects
        .select_for_update()
        .get(
            name="TOYMALL"
        )
    )

    # ---------------------------------------------------------
    # Increment counter
    # ---------------------------------------------------------

    counter.last_number += 1

    counter.save(
        update_fields=[
            "last_number",
            "updated_at",
        ]
    )

    return f"TM-{counter.last_number:06d}"