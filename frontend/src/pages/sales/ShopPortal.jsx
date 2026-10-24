import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  LogOut,
  Printer,
  X,
  Receipt,
  Package,
  RefreshCw,
} from "lucide-react";

import { useShopAuth } from "../../context/ShopAuthContext";

const API_BASE_URL = "https://toymall-inventory-pos.onrender.com/api";

/* =========================================================
   SHOP ADDRESSES
   ========================================================= */

const SHOP_ADDRESSES = {
  "Retail Shop 1":
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612",

  "Retail Shop 2":
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612",

  "Retail Shop 3":
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612",

  "Retail Shop 4":
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612",

  "Wholesale Shop":
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612",
};

/* =========================================================
   HELPERS
   ========================================================= */

const formatMoney = (value) => {
  const number = Number(value || 0);

  return `₹${number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatReceiptMoney = (value) => {
  const number = Number(value || 0);

  return number.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const getIndianDate = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getIndianTime = (dateValue) => {
  const date = dateValue ? new Date(dateValue) : new Date();

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/* =========================================================
   COMPONENT
   ========================================================= */

export default function ShopPortal() {
  const { shop, token, logout } = useShopAuth();

  const [products, setProducts] = useState([]);
  const [stockMap, setStockMap] = useState({});

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("");

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [completedInvoice, setCompletedInvoice] = useState(null);

  /* =========================================================
     AUTH HEADERS
     ========================================================= */

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  /* =========================================================
     SHOP TYPE
     ========================================================= */

  const saleType =
    shop?.shop_type === "WHOLESALE" ? "WHOLESALE" : "RETAIL";

  const shopAddress =
    SHOP_ADDRESSES[shop?.name] ||
    "Shop 4 Mohin Apartment, A Wing, Dargah Rd, Amrut Nagar, Mumbra, Thane, Maharashtra 400612";

  /* =========================================================
     FETCH PRODUCTS
     ========================================================= */

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await axios.get(`${API_BASE_URL}/products/`, {
        headers: authHeaders,
        params: search.trim()
          ? {
              search: search.trim(),
            }
          : {},
      });

      if (response.data?.results) {
        setProducts(response.data.results);
      } else if (Array.isArray(response.data)) {
        setProducts(response.data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Product fetch error:", err);

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Unable to load products."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  /* =========================================================
     FETCH STOCK
     ========================================================= */

  const fetchStock = async () => {
    try {
      setLoadingStock(true);

      const response = await axios.get(`${API_BASE_URL}/inventory/stock/`, {
        headers: authHeaders,
      });

      const stockRows = response.data?.results || response.data || [];

      const map = {};

      if (Array.isArray(stockRows)) {
        stockRows.forEach((row) => {
          const productId =
            row.product ||
            row.product_id ||
            row.product?.id;

          if (productId !== undefined && productId !== null) {
            map[productId] = Number(
              row.quantity ??
                row.stock_quantity ??
                row.current_stock ??
                0
            );
          }
        });
      }

      setStockMap(map);
    } catch (err) {
      console.error("Stock fetch error:", err);

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Unable to load stock."
      );
    } finally {
      setLoadingStock(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
     ========================================================= */

  useEffect(() => {
    fetchProducts();
    fetchStock();
  }, []);

  /* =========================================================
     SEARCH
     ========================================================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  /* =========================================================
     CART HELPERS
     ========================================================= */

  const getStock = (productId) => {
    return Number(stockMap[productId] || 0);
  };

  const getCartQuantity = (productId) => {
    const item = cart.find(
      (cartItem) => cartItem.product.id === productId
    );

    return item ? item.quantity : 0;
  };

  const addToCart = (product) => {
    setError("");
    setSuccessMessage("");

    const availableStock = getStock(product.id);

    if (availableStock <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }

    const existing = cart.find(
      (item) => item.product.id === product.id
    );

    if (existing) {
      if (existing.quantity >= availableStock) {
        setError(
          `Only ${availableStock} unit(s) of ${product.name} available.`
        );
        return;
      }

      setCart((prev) =>
        prev.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      );

      return;
    }

    const minimumPrice =
      product.minimum_selling_price !== null &&
      product.minimum_selling_price !== undefined
        ? Number(product.minimum_selling_price)
        : 0;

    const sellingPrice = Number(product.selling_price || 0);

    setCart((prev) => [
      ...prev,
      {
        product,
        quantity: 1,
        actual_sale_price: sellingPrice,
        minimum_price: minimumPrice,
      },
    ]);
  };

  const increaseQuantity = (productId) => {
    const availableStock = getStock(productId);
    const currentQuantity = getCartQuantity(productId);

    if (currentQuantity >= availableStock) {
      setError(`Only ${availableStock} unit(s) available.`);
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  };

  const decreaseQuantity = (productId) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) =>
      prev.filter((item) => item.product.id !== productId)
    );
  };

  const updateActualPrice = (productId, value) => {
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              actual_sale_price: value,
            }
          : item
      )
    );
  };

  /* =========================================================
     CALCULATIONS
     ========================================================= */

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      return (
        sum +
        Number(item.actual_sale_price || 0) *
          Number(item.quantity || 0)
      );
    }, 0);
  }, [cart]);

  const discountAmount = Math.max(
    0,
    Math.min(Number(discount || 0), subtotal)
  );

  const grandTotal = Math.max(
    0,
    subtotal - discountAmount
  );

  const totalItems = cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  /* =========================================================
     VALIDATE CART
     ========================================================= */

  const validateCart = () => {
    if (cart.length === 0) {
      setError("Please add at least one product to the cart.");
      return false;
    }

    for (const item of cart) {
      const quantity = Number(item.quantity || 0);
      const actualPrice = Number(
        item.actual_sale_price || 0
      );

      const minimumPrice = Number(
        item.minimum_price || 0
      );

      const availableStock = getStock(item.product.id);

      if (quantity <= 0) {
        setError(`Invalid quantity for ${item.product.name}.`);
        return false;
      }

      if (quantity > availableStock) {
        setError(
          `Only ${availableStock} unit(s) of ${item.product.name} available.`
        );
        return false;
      }

      if (actualPrice < minimumPrice) {
        setError(
          `${item.product.name}: selling price cannot be below ${formatMoney(
            minimumPrice
          )}.`
        );
        return false;
      }
    }

    if (Number(discount || 0) > subtotal) {
      setError("Discount cannot be greater than subtotal.");
      return false;
    }

    return true;
  };

  /* =========================================================
     CREATE SALE
     ========================================================= */

  const generateBill = async () => {
    setError("");
    setSuccessMessage("");

    if (!validateCart()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        sale_type: saleType,
        payment_method: paymentMethod,
        discount: Number(discount || 0),

        items: cart.map((item) => ({
          product: item.product.id,
          quantity: Number(item.quantity),
          actual_sale_price: Number(
            item.actual_sale_price
          ),
        })),
      };

      const response = await axios.post(
        `${API_BASE_URL}/sales/create/`,
        payload,
        {
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
        }
      );

      const sale = response.data?.sale;

      if (!sale) {
        throw new Error("Sale response is missing.");
      }

      /*
       * Backend is the source of truth.
       * Invoice number, total, date etc. come from backend.
       */

      setCompletedInvoice(sale);

      setCart([]);
      setDiscount("");
      setPaymentMethod("CASH");

      await fetchStock();

      setSuccessMessage(
        "Sale completed successfully."
      );
    } catch (err) {
      console.error("Sale creation error:", err);

      const backendData = err.response?.data;

      let message =
        backendData?.detail ||
        backendData?.message ||
        "Unable to create sale.";

      if (backendData?.errors) {
        message = JSON.stringify(
          backendData.errors
        );
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  /* =========================================================
     NEW SALE
     ========================================================= */

  const startNewSale = () => {
    setCompletedInvoice(null);
    setError("");
    setSuccessMessage("");
    setCart([]);
    setDiscount("");
    setPaymentMethod("CASH");

    fetchProducts();
    fetchStock();
  };

  /* =========================================================
     PRINT RECEIPT ONLY - 80MM THERMAL PRINTER
     ========================================================= */

  const handlePrintBill = () => {
    const receipt = document.getElementById("print-invoice");

    if (!receipt) {
      setError("Bill receipt nahi mila. Please bill dobara generate karein.");
      return;
    }

    const receiptHeightMm = Math.max(
      120,
      Math.ceil((receipt.scrollHeight * 25.4) / 96 + 8)
    );
    const printWindow = window.open("", "_blank", "width=420,height=720");

    if (!printWindow) {
      setError("Print window block ho gayi. Browser mein pop-ups allow karein.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ToyMall Bill</title>
          <style>
            @page { size: 80mm ${receiptHeightMm}mm; margin: 0; }
            * { box-sizing: border-box; }
            html, body {
              width: 80mm; margin: 0; padding: 0; background: #fff; color: #000;
              font-family: "Courier New", Courier, monospace;
              -webkit-print-color-adjust: exact; print-color-adjust: exact;
            }
            #print-invoice, .thermal-receipt {
              display: block; width: 80mm !important; max-width: 80mm !important;
              min-height: 0 !important; height: auto !important; margin: 0 !important;
              padding: 4mm 3.5mm !important; overflow: visible !important;
              background: #fff !important; color: #000 !important; box-shadow: none !important;
              font-family: "Courier New", Courier, monospace; font-size: 11px; line-height: 1.35;
            }
            .receipt-center { text-align: center; }
            .receipt-brand { font-size: 20px; line-height: 1.1; font-weight: 900; letter-spacing: 1px; margin-bottom: 6px; }
            .receipt-address { font-size: 10px; line-height: 1.35; font-weight: 600; }
            .receipt-separator { width: 100%; overflow: hidden; white-space: nowrap; margin: 7px 0; font-size: 10px; }
            .receipt-info { width: 100%; font-size: 10px; }
            .receipt-info > div { display: flex; justify-content: space-between; gap: 8px; margin-bottom: 2px; }
            .receipt-items-header, .receipt-item {
              display: grid; grid-template-columns: minmax(0, 1fr) 25px 55px 65px;
              column-gap: 3px; align-items: center; width: 100%; font-size: 9px;
            }
            .receipt-items-header { font-weight: 900; margin-bottom: 4px; }
            .receipt-item { margin-bottom: 4px; font-size: 9px; }
            .receipt-product { min-width: 0; text-align: left; overflow-wrap: anywhere; word-break: break-word; }
            .receipt-qty { text-align: center; }
            .receipt-rate, .receipt-amount { text-align: right; white-space: nowrap; }
            .receipt-total-row { display: flex; justify-content: space-between; gap: 8px; width: 100%; font-size: 10px; margin-bottom: 3px; }
            .receipt-grand-total { display: flex; justify-content: space-between; gap: 8px; width: 100%; font-size: 13px; font-weight: 900; margin: 5px 0; }
            .receipt-footer { margin-top: 10px; font-size: 11px; line-height: 1.6; font-weight: 700; }
            @media screen { body { margin: 0 auto; } #print-invoice { border: 1px solid #eee; } }
          </style>
        </head>
        <body>
          ${receipt.outerHTML}
          <script>
            window.onload = () => {
              window.focus();
              setTimeout(() => window.print(), 300);
            };
            window.onafterprint = () => window.close();
          </script>
        </body>
      </html>`);
    printWindow.document.close();
  };

  /* =========================================================
     LOGOUT
     ========================================================= */

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      "Are you sure you want to logout?"
    );

    if (!confirmLogout) {
      return;
    }

    logout();
  };

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="toymall-pos min-h-screen bg-slate-100 text-slate-900">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              ToyMall
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <span className="font-medium">
                {shop?.name || "Shop"}
              </span>

              <span>•</span>

              <span>
                {saleType === "WHOLESALE"
                  ? "Wholesale Sale"
                  : "Retail Sale"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-[1600px] px-4 py-5 md:px-6">
        {/* Alerts */}

        {error && (
          <div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
          {/* =================================================
              PRODUCTS
          ================================================= */}

          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">
                    Products
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Search and add products to the bill.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    fetchProducts();
                    fetchStock();
                  }}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  title="Refresh"
                >
                  <RefreshCw
                    size={16}
                    className={
                      loadingProducts || loadingStock
                        ? "animate-spin"
                        : ""
                    }
                  />

                  Refresh
                </button>
              </div>

              {/* Search */}

              <div className="relative">
                <Search
                  size={20}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search by product name, SKU or barcode..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Product list */}

            <div className="p-4 md:p-5">
              {loadingProducts ? (
                <div className="flex min-h-[300px] items-center justify-center text-slate-500">
                  Loading products...
                </div>
              ) : products.length === 0 ? (
                <div className="flex min-h-[300px] flex-col items-center justify-center text-center text-slate-500">
                  <Package size={42} className="mb-3" />

                  <p className="font-semibold">
                    No products found
                  </p>

                  <p className="mt-1 text-sm">
                    Try another product name, SKU or barcode.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => {
                    const availableStock =
                      getStock(product.id);

                    const cartQuantity =
                      getCartQuantity(product.id);

                    const isOutOfStock =
                      availableStock <= 0;

                    const isMaxed =
                      cartQuantity >= availableStock &&
                      availableStock > 0;

                    return (
                      <div
                        key={product.id}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:border-slate-300 hover:shadow-md"
                      >
                        <div className="flex h-36 items-center justify-center bg-slate-50">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <Package
                              size={46}
                              className="text-slate-300"
                            />
                          )}
                        </div>

                        <div className="p-4">
                          <div className="mb-2">
                            <h3 className="font-bold text-slate-900">
                              {product.name}
                            </h3>

                            <div className="mt-1 text-xs text-slate-500">
                              SKU: {product.sku}
                            </div>
                          </div>

                          <div className="mb-3 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-lg font-extrabold">
                                {formatMoney(
                                  product.selling_price
                                )}
                              </div>

                              <div className="text-xs text-slate-500">
                                Min:{" "}
                                {formatMoney(
                                  product.minimum_selling_price
                                )}
                              </div>
                            </div>

                            <div
                              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                isOutOfStock
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              Stock: {availableStock}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={
                              isOutOfStock || isMaxed
                            }
                            onClick={() =>
                              addToCart(product)
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            <Plus size={17} />

                            {isOutOfStock
                              ? "Out of Stock"
                              : isMaxed
                              ? "Maximum Added"
                              : "Add to Cart"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              CART
          ================================================= */}

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white shadow-sm lg:sticky lg:top-[96px]">
            <div className="flex items-center justify-between border-b border-slate-200 p-4 md:p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-slate-900 p-2.5 text-white">
                  <ShoppingCart size={19} />
                </div>

                <div>
                  <h2 className="font-bold">
                    Current Bill
                  </h2>

                  <p className="text-xs text-slate-500">
                    {totalItems} item
                    {totalItems !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Cart Items */}

            <div className="max-h-[430px] overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center text-slate-400">
                  <ShoppingCart
                    size={42}
                    className="mb-3"
                  />

                  <p className="font-semibold">
                    Cart is empty
                  </p>

                  <p className="mt-1 text-sm">
                    Add products to create a bill.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => {
                    const product = item.product;

                    const lineTotal =
                      Number(
                        item.actual_sale_price || 0
                      ) *
                      Number(item.quantity || 0);

                    return (
                      <div
                        key={product.id}
                        className="rounded-xl border border-slate-200 p-3"
                      >
                        <div className="flex justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold">
                              {product.name}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              Regular:{" "}
                              {formatMoney(
                                product.selling_price
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(product.id)
                            }
                            className="shrink-0 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          {/* Quantity */}

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Quantity
                            </label>

                            <div className="flex items-center justify-between rounded-lg border border-slate-200">
                              <button
                                type="button"
                                onClick={() =>
                                  decreaseQuantity(
                                    product.id
                                  )
                                }
                                className="p-2 hover:bg-slate-50"
                              >
                                <Minus size={15} />
                              </button>

                              <span className="text-sm font-bold">
                                {item.quantity}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  increaseQuantity(
                                    product.id
                                  )
                                }
                                className="p-2 hover:bg-slate-50"
                              >
                                <Plus size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Actual Sale Price */}

                          <div>
                            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Sale Price
                            </label>

                            <input
                              type="number"
                              min={item.minimum_price}
                              step="0.01"
                              value={
                                item.actual_sale_price
                              }
                              onChange={(e) =>
                                updateActualPrice(
                                  product.id,
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-slate-400"
                            />
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                          <span className="text-xs text-slate-500">
                            Line Total
                          </span>

                          <span className="font-bold">
                            {formatMoney(lineTotal)}
                          </span>
                        </div>

                        <div className="mt-1 text-[11px] text-slate-400">
                          Minimum price:{" "}
                          {formatMoney(
                            item.minimum_price
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Checkout */}

            <div className="border-t border-slate-200 p-4">
              {/* Payment */}

              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payment Method
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    ["CASH", "Cash"],
                    ["UPI", "UPI"],
                    ["CARD", "Card"],
                    ["CREDIT", "Credit"],
                    ["OTHER", "Other"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setPaymentMethod(value)
                      }
                      className={`rounded-lg border px-3 py-2.5 text-sm font-semibold transition ${
                        paymentMethod === value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount */}

              <div className="mb-4">
                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Discount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value)
                  }
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>

              {/* Summary */}

              <div className="space-y-2 border-t border-dashed border-slate-300 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-semibold">
                    {formatMoney(subtotal)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Discount
                  </span>

                  <span className="font-semibold text-red-600">
                    - {formatMoney(discountAmount)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <span className="text-lg font-extrabold">
                    Grand Total
                  </span>

                  <span className="text-2xl font-extrabold">
                    {formatMoney(grandTotal)}
                  </span>
                </div>
              </div>

              {/* Generate Bill */}

              <button
                type="button"
                disabled={
                  submitting || cart.length === 0
                }
                onClick={generateBill}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 text-base font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Receipt size={19} />

                {submitting
                  ? "Generating Bill..."
                  : "Generate Bill"}
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* =====================================================
          THERMAL RECEIPT MODAL
      ===================================================== */}

      {completedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl">
            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <h2 className="font-bold">
                  Bill Generated
                </h2>

                <p className="text-xs text-slate-500">
                  Invoice:{" "}
                  {completedInvoice.invoice_number ||
                    completedInvoice.invoice?.invoice_number ||
                    "N/A"}
                </p>
              </div>

              <button
                type="button"
                onClick={startNewSale}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            {/* Receipt Preview */}

            <div className="overflow-y-auto p-4">
              <div
                id="print-invoice"
                className="thermal-receipt mx-auto bg-white text-black"
              >
                {/* HEADER */}

                <div className="receipt-center receipt-brand">
                  TOYMALL
                </div>

                <div className="receipt-center receipt-address">
                  Shop 4 Mohin Apartment,
                  <br />
                  A Wing, Dargah Rd
                  <br />
                  Amrut Nagar, Mumbra,
                  <br />
                  Thane, Maharashtra 400612
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                {/* INVOICE INFO */}

                <div className="receipt-info">
                  <div>
                    <span>Invoice:</span>
                    <span>
                      {completedInvoice.invoice_number ||
                        completedInvoice.invoice?.invoice_number ||
                        "N/A"}
                    </span>
                  </div>

                  <div>
                    <span>Date:</span>
                    <span>
                      {getIndianDate(
                        completedInvoice.created_at ||
                          completedInvoice.invoice?.created_at
                      )}
                    </span>
                  </div>

                  <div>
                    <span>Time:</span>
                    <span>
                      {getIndianTime(
                        completedInvoice.created_at ||
                          completedInvoice.invoice?.created_at
                      )}
                    </span>
                  </div>
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                {/* ITEMS HEADER */}

                <div className="receipt-items-header">
                  <span className="receipt-product">
                    Product
                  </span>

                  <span className="receipt-qty">
                    Qty
                  </span>

                  <span className="receipt-rate">
                    Rate
                  </span>

                  <span className="receipt-amount">
                    Amt
                  </span>
                </div>

                {/* ITEMS */}

                <div className="receipt-items">
                  {(
                    completedInvoice.items || []
                  ).map((item, index) => {
                    const productName =
                      item.product_name ||
                      item.product?.name ||
                      item.name ||
                      "Product";

                    const quantity = Number(
                      item.quantity || 0
                    );

                    const rate = Number(
                      item.actual_sale_price ??
                        item.sale_price ??
                        item.regular_price ??
                        0
                    );

                    const amount =
                      Number(
                        item.line_total ?? 0
                      ) ||
                      rate * quantity;

                    return (
                      <div
                        key={
                          item.id ||
                          `${productName}-${index}`
                        }
                        className="receipt-item"
                      >
                        <span className="receipt-product">
                          {productName}
                        </span>

                        <span className="receipt-qty">
                          {quantity}
                        </span>

                        <span className="receipt-rate">
                          {formatReceiptMoney(rate)}
                        </span>

                        <span className="receipt-amount">
                          {formatReceiptMoney(amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                {/* TOTALS */}

                <div className="receipt-total-row">
                  <span>Subtotal:</span>

                  <span>
                    {formatReceiptMoney(
                      completedInvoice.subtotal
                    )}
                  </span>
                </div>

                <div className="receipt-total-row">
                  <span>Discount:</span>

                  <span>
                    {formatReceiptMoney(
                      completedInvoice.discount
                    )}
                  </span>
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                <div className="receipt-grand-total">
                  <span>GRAND TOTAL:</span>

                  <span>
                    {formatReceiptMoney(
                      completedInvoice.total
                    )}
                  </span>
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                <div className="receipt-total-row">
                  <span>Payment:</span>

                  <span>
                    {completedInvoice.payment_method ||
                      "CASH"}
                  </span>
                </div>

                <div className="receipt-separator">
                  --------------------------------
                </div>

                {/* FOOTER */}

                <div className="receipt-center receipt-footer">
                  <div>Thank You!</div>
                  <div>Visit Again</div>
                </div>
              </div>
            </div>

            {/* Buttons */}

            <div className="flex gap-3 border-t border-slate-200 bg-white p-4">
              <button
                type="button"
                onClick={handlePrintBill}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 font-bold text-white hover:bg-slate-800"
              >
                <Printer size={18} />
                Print Bill
              </button>

              <button
                type="button"
                onClick={startNewSale}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          THERMAL PRINT CSS
      ===================================================== */}

      <style>{`
        /* =====================================================
           TOYMALL PREMIUM POS THEME
           UI-only styling; billing and inventory logic unchanged.
        ===================================================== */
        .toymall-pos {
          --tm-ink: #111827;
          --tm-muted: #64748b;
          --tm-line: #e2e8f0;
          --tm-lime: #d6f36a;
          background: #f4f6f8 !important;
          color: var(--tm-ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .toymall-pos header {
          background: rgba(17, 24, 39, .97) !important;
          color: #fff !important;
          border-color: #293244 !important;
          box-shadow: 0 8px 30px rgba(15, 23, 42, .12) !important;
          backdrop-filter: blur(16px);
        }
        .toymall-pos header h1 { color: #fff !important; letter-spacing: -.055em; }
        .toymall-pos header .text-slate-500,
        .toymall-pos header .text-slate-700 { color: #cbd5e1 !important; }
        .toymall-pos header button {
          border-color: #475569 !important; background: #1f2937 !important; color: #fff !important;
          border-radius: 12px;
        }
        .toymall-pos header button:hover { background: #374151 !important; }
        .toymall-pos main { padding-top: 28px; padding-bottom: 36px; }
        .toymall-pos main > div > section,
        .toymall-pos main > div > aside {
          border: 1px solid #e7ebf0 !important; border-radius: 22px !important;
          box-shadow: 0 10px 35px rgba(15, 23, 42, .045) !important;
        }
        .toymall-pos main > div > section { overflow: hidden; }
        .toymall-pos main > div > section > div:first-child {
          background: linear-gradient(135deg, #fff 0%, #f8fafc 100%);
          padding: 22px !important;
        }
        .toymall-pos h2 { letter-spacing: -.025em; }
        .toymall-pos input { transition: border-color .18s ease, box-shadow .18s ease, background .18s ease; }
        .toymall-pos input:focus {
          border-color: #94a3b8 !important;
          box-shadow: 0 0 0 4px rgba(148, 163, 184, .16);
        }
        .toymall-pos main > div > section .grid > div {
          border-color: #e6eaf0 !important; border-radius: 18px !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, .025);
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .toymall-pos main > div > section .grid > div:hover {
          transform: translateY(-3px); border-color: #cbd5e1 !important;
          box-shadow: 0 14px 28px rgba(15, 23, 42, .09) !important;
        }
        .toymall-pos main > div > section .grid > div > div:first-child {
          height: 170px !important; background: linear-gradient(145deg, #f8fafc, #eef2f7) !important;
          border-bottom: 1px solid #eef2f7;
        }
        .toymall-pos main > div > section .grid > div img {
          padding: 12px; transition: transform .25s ease;
        }
        .toymall-pos main > div > section .grid > div:hover img { transform: scale(1.045); }
        .toymall-pos button { transition: transform .16s ease, background .16s ease, box-shadow .16s ease; }
        .toymall-pos button:active:not(:disabled) { transform: scale(.985); }
        .toymall-pos main > div > section .grid > div button {
          background: #111827 !important; border-radius: 12px !important;
          box-shadow: 0 5px 12px rgba(17, 24, 39, .12);
        }
        .toymall-pos main > div > section .grid > div button:hover:not(:disabled) {
          background: #273449 !important; box-shadow: 0 8px 16px rgba(17, 24, 39, .16);
        }
        .toymall-pos main > div > aside { overflow: hidden; }
        .toymall-pos main > div > aside > div:first-child {
          background: #111827 !important; color: #fff !important; border-color: #111827 !important;
        }
        .toymall-pos main > div > aside > div:first-child h2 { color: #fff !important; }
        .toymall-pos main > div > aside > div:first-child p { color: #cbd5e1 !important; }
        .toymall-pos main > div > aside > div:first-child .bg-slate-900 {
          background: var(--tm-lime) !important; color: #111827 !important;
        }
        .toymall-pos main > div > aside .rounded-xl.border,
        .toymall-pos main > div > aside .rounded-xl.border-slate-200 {
          border-radius: 14px !important;
        }
        .toymall-pos main > div > aside button.bg-slate-900,
        .toymall-pos main > div > aside button.border-slate-900 {
          border-color: #111827 !important;
        }
        .toymall-pos main > div > aside button.bg-emerald-600 {
          background: var(--tm-lime) !important; color: #111827 !important;
          border-radius: 14px !important; box-shadow: 0 8px 18px rgba(214, 243, 106, .25);
        }
        .toymall-pos main > div > aside button.bg-emerald-600:hover:not(:disabled) { background: #c8e65b !important; }
        .toymall-pos .thermal-receipt {
          border: 1px dashed #d1d5db; box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
        }
        @media (max-width: 1023px) {
          .toymall-pos main > div { gap: 18px; }
          .toymall-pos main > div > aside { position: static !important; }
        }
        @media (max-width: 640px) {
          .toymall-pos header > div { padding: 13px 16px !important; }
          .toymall-pos header h1 { font-size: 22px !important; }
          .toymall-pos main { padding: 14px 12px 24px !important; }
          .toymall-pos main > div > section,
          .toymall-pos main > div > aside { border-radius: 17px !important; }
          .toymall-pos main > div > section .grid > div > div:first-child { height: 145px !important; }
        }

        .thermal-receipt {
          width: 80mm;
          max-width: 80mm;
          min-height: 80mm;
          padding: 4mm 3.5mm;
          box-sizing: border-box;
          font-family: "Courier New", Courier, monospace;
          font-size: 11px;
          line-height: 1.35;
          color: #000;
          background: #fff;
        }

        .receipt-center {
          text-align: center;
        }

        .receipt-brand {
          font-size: 20px;
          line-height: 1.1;
          font-weight: 900;
          letter-spacing: 1px;
          margin-bottom: 6px;
        }

        .receipt-address {
          font-size: 10px;
          line-height: 1.35;
          font-weight: 600;
        }

        .receipt-separator {
          width: 100%;
          overflow: hidden;
          white-space: nowrap;
          margin: 7px 0;
          font-size: 10px;
        }

        .receipt-info {
          width: 100%;
          font-size: 10px;
        }

        .receipt-info > div {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 2px;
        }

        .receipt-items-header,
        .receipt-item {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 25px 55px 65px;
          column-gap: 3px;
          align-items: center;
          width: 100%;
          font-size: 9px;
        }

        .receipt-items-header {
          font-weight: 900;
          margin-bottom: 4px;
        }

        .receipt-item {
          margin-bottom: 4px;
          font-size: 9px;
        }

        .receipt-product {
          min-width: 0;
          text-align: left;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .receipt-qty {
          text-align: center;
        }

        .receipt-rate,
        .receipt-amount {
          text-align: right;
          white-space: nowrap;
        }

        .receipt-total-row {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .receipt-grand-total {
          display: flex;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          font-size: 13px;
          font-weight: 900;
          margin: 5px 0;
        }

        .receipt-footer {
          margin-top: 10px;
          font-size: 11px;
          line-height: 1.6;
          font-weight: 700;
        }

        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }

          html,
          body {
            width: 80mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #print-invoice,
          #print-invoice * {
            visibility: visible !important;
          }

          #print-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm 3.5mm !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
          }

          .thermal-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
          }
        }


        /* =====================================================
           VYAPAR-INSPIRED INVENTORY / POS UI
           Visual styling only. Existing billing and inventory
           behavior is intentionally unchanged.
        ===================================================== */
        .toymall-pos {
          --tm-ink: #172b4d;
          --tm-muted: #667085;
          --tm-line: #e4e9f0;
          --tm-lime: #087f8c;
          background: #f5f7fa !important;
          color: #172b4d !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .toymall-pos header {
          background: #ffffff !important;
          color: #172b4d !important;
          border-bottom: 1px solid #e4e9f0 !important;
          box-shadow: 0 2px 8px rgba(23, 43, 77, .045) !important;
          backdrop-filter: none !important;
        }
        .toymall-pos header h1 {
          color: #087f8c !important;
          font-size: 25px !important;
          letter-spacing: -.045em !important;
        }
        .toymall-pos header .text-slate-500,
        .toymall-pos header .text-slate-700 {
          color: #667085 !important;
        }
        .toymall-pos header button {
          border: 1px solid #d9e1ea !important;
          background: #fff !important;
          color: #344054 !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .toymall-pos header button:hover {
          background: #f5f8fb !important;
          color: #087f8c !important;
        }
        .toymall-pos main {
          max-width: 1600px;
          padding-top: 22px !important;
          padding-bottom: 32px !important;
        }
        .toymall-pos main > div > section,
        .toymall-pos main > div > aside {
          border: 1px solid #e4e9f0 !important;
          border-radius: 12px !important;
          box-shadow: 0 2px 10px rgba(23, 43, 77, .035) !important;
          background: #fff !important;
        }
        .toymall-pos main > div > section > div:first-child {
          background: #fff !important;
          border-bottom: 1px solid #e4e9f0 !important;
          padding: 20px !important;
        }
        .toymall-pos h2 {
          color: #172b4d !important;
          letter-spacing: -.025em;
        }
        .toymall-pos input {
          border-radius: 8px !important;
          border-color: #d5dde7 !important;
          background: #fff !important;
          box-shadow: none;
        }
        .toymall-pos input:focus {
          border-color: #087f8c !important;
          box-shadow: 0 0 0 3px rgba(8, 127, 140, .12) !important;
        }
        .toymall-pos main > div > section .grid > div {
          border: 1px solid #e4e9f0 !important;
          border-radius: 10px !important;
          box-shadow: none !important;
          background: #fff !important;
        }
        .toymall-pos main > div > section .grid > div:hover {
          transform: translateY(-2px);
          border-color: #9acbd0 !important;
          box-shadow: 0 5px 16px rgba(23, 43, 77, .075) !important;
        }
        .toymall-pos main > div > section .grid > div > div:first-child {
          height: 145px !important;
          background: #f8fafc !important;
          border-bottom: 1px solid #edf0f4 !important;
        }
        .toymall-pos main > div > section .grid > div img {
          padding: 10px;
        }
        .toymall-pos main > div > section .grid > div button {
          background: #087f8c !important;
          border: 1px solid #087f8c !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .toymall-pos main > div > section .grid > div button:hover:not(:disabled) {
          background: #066873 !important;
          border-color: #066873 !important;
          box-shadow: none !important;
        }
        .toymall-pos main > div > aside {
          border-radius: 12px !important;
          overflow: hidden;
        }
        .toymall-pos main > div > aside > div:first-child {
          background: #f8fafc !important;
          color: #172b4d !important;
          border-color: #e4e9f0 !important;
        }
        .toymall-pos main > div > aside > div:first-child h2 {
          color: #172b4d !important;
        }
        .toymall-pos main > div > aside > div:first-child p {
          color: #667085 !important;
        }
        .toymall-pos main > div > aside > div:first-child .bg-slate-900 {
          background: #e0f2f1 !important;
          color: #087f8c !important;
        }
        .toymall-pos main > div > aside .rounded-xl.border,
        .toymall-pos main > div > aside .rounded-xl.border-slate-200 {
          border-radius: 8px !important;
        }
        .toymall-pos main > div > aside button.bg-slate-900,
        .toymall-pos main > div > aside button.border-slate-900 {
          border-color: #087f8c !important;
          background: #087f8c !important;
          color: #fff !important;
        }
        .toymall-pos main > div > aside button.bg-emerald-600 {
          background: #087f8c !important;
          color: #fff !important;
          border: 1px solid #087f8c !important;
          border-radius: 9px !important;
          box-shadow: none !important;
        }
        .toymall-pos main > div > aside button.bg-emerald-600:hover:not(:disabled) {
          background: #066873 !important;
        }
        .toymall-pos .thermal-receipt {
          border: 1px dashed #d1d5db;
          box-shadow: 0 10px 24px rgba(15, 23, 42, .08);
        }
        .toymall-pos button {
          cursor: pointer;
          transition: background-color .16s ease, border-color .16s ease, box-shadow .16s ease;
        }
        .toymall-pos button:disabled {
          cursor: not-allowed;
        }
        @media (max-width: 1023px) {
          .toymall-pos main > div { gap: 16px; }
          .toymall-pos main > div > aside { position: static !important; }
        }
        @media (max-width: 640px) {
          .toymall-pos header > div { padding: 13px 14px !important; }
          .toymall-pos header h1 { font-size: 22px !important; }
          .toymall-pos main { padding: 14px 10px 22px !important; }
          .toymall-pos main > div > section,
          .toymall-pos main > div > aside { border-radius: 10px !important; }
          .toymall-pos main > div > section .grid > div > div:first-child { height: 130px !important; }
        }

      `}</style>
    </div>
  );
}