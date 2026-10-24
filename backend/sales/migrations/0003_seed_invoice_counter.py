from django.db import migrations


def seed_invoice_counter(apps, schema_editor):
    Sale = apps.get_model("sales", "Sale")
    InvoiceCounter = apps.get_model("sales", "InvoiceCounter")

    last_sale_id = (
        Sale.objects.order_by("-id")
        .values_list("id", flat=True)
        .first()
        or 0
    )

    InvoiceCounter.objects.update_or_create(
        name="TOYMALL",
        defaults={"last_number": last_sale_id},
    )


def reverse_seed_invoice_counter(apps, schema_editor):
    InvoiceCounter = apps.get_model("sales", "InvoiceCounter")
    InvoiceCounter.objects.filter(name="TOYMALL").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0002_invoicecounter"),
    ]

    operations = [
        migrations.RunPython(
            seed_invoice_counter,
            reverse_seed_invoice_counter,
        ),
    ]