

import { useCallback, useEffect, useRef, useState } from "react";

import axios from "axios";

import {

  LayoutDashboard,

  Package,

  Boxes,

  ShoppingCart,

  FileText,

  BarChart3,

  LogOut,

  Menu,

  X,

  RefreshCw,

  Store,

  TrendingUp,

  Receipt,

  AlertTriangle,

  IndianRupee,

  CalendarDays,

  Search,

  Plus,

  Save,

  Pencil,

  CheckCircle,

  Trash2,
} from "lucide-react";

import { useAdminAuth } from "../../context/AdminAuthContext";



const API_BASE_URL = "https://toymall-inventory-pos.onrender.com/api";



function getLocalDate() {

  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, "0");

  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;

}



function formatCurrency(value) {

  return `₹${Number(value || 0).toLocaleString("en-IN", {

    minimumFractionDigits: 2,

    maximumFractionDigits: 2,

  })}`;

}



function formatDateTime(value) {

  if (!value) return "-";



  const date = new Date(value);



  if (Number.isNaN(date.getTime())) return String(value);



  return date.toLocaleString("en-IN", {

    day: "2-digit",

    month: "short",

    year: "numeric",

    hour: "2-digit",

    minute: "2-digit",

  });

}



function StatCard({ title, value, subtitle, icon: Icon, iconClass, onClick }) {
  const cardClass = "w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md";
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
        {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
        {onClick && <p className="mt-2 text-xs font-semibold text-blue-600">Click to view details</p>}
      </div>
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon size={21} />
      </div>
    </div>
  );
  if (onClick) return <button type="button" onClick={onClick} className={`${cardClass} cursor-pointer hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300`}>{content}</button>;
  return <div className={cardClass}>{content}</div>;
}

function SectionHeader({ icon: Icon, title, subtitle, action }) {

  return (

    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">

          <Icon size={19} />

        </div>



        <div>

          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          {subtitle && (

            <p className="text-xs text-slate-500">{subtitle}</p>

          )}

        </div>

      </div>



      {action}

    </div>

  );

}



function EmptyState({ message }) {

  return (

    <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4">

      <p className="text-center text-sm text-slate-500">{message}</p>

    </div>

  );

}



function formatCreateProductError(data) {
  if (!data) return "Product create failed. Backend response nahi mila.";
  const parts = [];
  const walk = (value, path = "") => {
    if (value === null || value === undefined || value === "") return;
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, path));
      return;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([key, child]) => walk(child, path ? `${path}.${key}` : key));
      return;
    }
    parts.push(path ? `${path}: ${String(value)}` : String(value));
  };
  walk(data);
  return parts.join(" | ") || "Product create failed. Backend fields verify karein.";
}

export default function Dashboard() {

  const { admin, token, logout } = useAdminAuth();



  const logoutRef = useRef(logout);

  logoutRef.current = logout;



  const [dashboard, setDashboard] = useState(null);

  const [shops, setShops] = useState([]);

  const [selectedShop, setSelectedShop] = useState("");



  const [shopsLoading, setShopsLoading] = useState(true);

  const [loading, setLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);



  const [error, setError] = useState("");

  const [shopError, setShopError] = useState("");

  const [stockMessage, setStockMessage] = useState("");

  const [stockError, setStockError] = useState("");



  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [detailModal, setDetailModal] = useState(null);
  const [detailSearch, setDetailSearch] = useState("");



  // Date filter

  const [dateFrom, setDateFrom] = useState(getLocalDate);

  const [dateTo, setDateTo] = useState(getLocalDate);



  const [appliedDateFrom, setAppliedDateFrom] = useState(getLocalDate);

  const [appliedDateTo, setAppliedDateTo] = useState(getLocalDate);



  // Product search and stock editing

  const [productSearch, setProductSearch] = useState("");

  const [quantityDrafts, setQuantityDrafts] = useState({});

  const [addQuantityDrafts, setAddQuantityDrafts] = useState({});

  const [savingProductId, setSavingProductId] = useState(null);

  // Add Product modal and per-shop opening stock
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [productCreateMode, setProductCreateMode] = useState("multi");
  const [newProductImage, setNewProductImage] = useState(null);
  const [savingNewProduct, setSavingNewProduct] = useState(false);
  const [newProductError, setNewProductError] = useState("");
  const [newProductMessage, setNewProductMessage] = useState("");
  const [newProduct, setNewProduct] = useState({
    name: "", sku: "", barcode: "", category: "", purchase_price: "",
    selling_price: "", minimum_selling_price: "", description: "", active: true,
  });
  const [selectedNewShops, setSelectedNewShops] = useState({});
  const [initialStocks, setInitialStocks] = useState({});



  const selectedShopInfo = shops.find(

    (shop) => String(shop.id) === String(selectedShop)

  );



  const authHeaders = token

    ? { Authorization: `Bearer ${token}` }

    : {};



  const handleAuthError = useCallback((err) => {

    if (err.response?.status === 401 || err.response?.status === 403) {

      logoutRef.current();

      window.location.assign("/admin-panel");

      return true;

    }



    return false;

  }, []);



  // Load active shops

  useEffect(() => {

    let cancelled = false;



    async function fetchShops() {

      setShopsLoading(true);

      setShopError("");



      try {

        const response = await axios.get(`${API_BASE_URL}/shops/`);



        if (!cancelled && response.data?.success) {

          const shopList = Array.isArray(response.data.shops)

            ? response.data.shops

            : [];



          setShops(shopList);

        } else if (!cancelled) {

          setShopError(

            response.data?.message || "Shops could not be loaded."

          );

        }

      } catch (err) {

        if (!cancelled) {

          setShopError(

            err.response?.data?.detail ||

              err.response?.data?.message ||

              "Unable to load shops. Check that the backend is running."

          );

        }

      } finally {

        if (!cancelled) setShopsLoading(false);

      }

    }



    fetchShops();



    return () => {

      cancelled = true;

    };

  }, []);



  // Load dashboard, date-filtered sales and shop inventory

  const fetchDashboard = useCallback(

    async (showRefreshLoader = false, shopId = selectedShop) => {

      if (!shopId) {

        setDashboard(null);

        setError("");

        setLoading(false);

        setRefreshing(false);

        return;

      }



      if (showRefreshLoader) {

        setRefreshing(true);

      } else {

        setLoading(true);

      }



      setError("");

      setStockError("");

      setStockMessage("");



      try {

        const response = await axios.get(

          `${API_BASE_URL}/accounts/admin/dashboard/`,

          {

            headers: authHeaders,

            params: {

              shop_id: shopId,

              date_from: appliedDateFrom,

              date_to: appliedDateTo,

            },

          }

        );



        if (response.data?.success) {

          setDashboard(response.data.dashboard || null);

          setQuantityDrafts({});

          setAddQuantityDrafts({});

        } else {

          setDashboard(null);

          setError(

            response.data?.message || "Unable to load dashboard data."

          );

        }

      } catch (err) {

        if (handleAuthError(err)) return;



        setDashboard(null);

        setError(

          err.response?.data?.detail ||

            err.response?.data?.message ||

            "Failed to load selected shop dashboard."

        );

      } finally {

        setLoading(false);

        setRefreshing(false);

      }

    },

    [token, selectedShop, appliedDateFrom, appliedDateTo, handleAuthError]

  );



  useEffect(() => {

    if (selectedShop) {

      fetchDashboard(false, selectedShop);

    } else {

      setDashboard(null);

      setError("");

      setLoading(false);

    }

  }, [selectedShop, appliedDateFrom, appliedDateTo, fetchDashboard]);



  function handleShopChange(event) {

    setDashboard(null);

    setError("");

    setStockMessage("");

    setSelectedShop(event.target.value);

  }



  function handleApplyDateFilter(event) {

    event.preventDefault();



    if (!dateFrom || !dateTo) {

      setError("Please select both From Date and To Date.");

      return;

    }



    if (dateFrom > dateTo) {

      setError("From Date cannot be after To Date.");

      return;

    }



    setAppliedDateFrom(dateFrom);

    setAppliedDateTo(dateTo);

  }



  function handleResetDateFilter() {

    const today = getLocalDate();



    setDateFrom(today);

    setDateTo(today);

    setAppliedDateFrom(today);

    setAppliedDateTo(today);

  }



  function goToSection(sectionId) {

    setSidebarOpen(false);



    if (sectionId === "dashboard-top") {

      window.scrollTo({ top: 0, behavior: "smooth" });

      return;

    }



    document.getElementById(sectionId)?.scrollIntoView({

      behavior: "smooth",

      block: "start",

    });

  }



  function handleLogout() {

    logout();

    window.location.assign("/admin-panel");

  }



  // Set exact stock quantity

  async function handleSetStock(product) {

    const rawQuantity = quantityDrafts[product.id];



    if (rawQuantity === undefined || String(rawQuantity).trim() === "") {

      setStockError("Please enter a stock quantity.");

      return;

    }



    const quantity = Number(rawQuantity);



    if (!Number.isInteger(quantity) || quantity < 0) {

      setStockError("Stock quantity must be a non-negative whole number.");

      return;

    }



    setSavingProductId(product.id);

    setStockError("");

    setStockMessage("");



    try {

      const response = await axios.patch(

        `${API_BASE_URL}/accounts/admin/dashboard/`,

        {

          shop_id: selectedShop,

          product_id: product.id,

          action: "set",

          quantity,

        },

        { headers: authHeaders }

      );



      if (response.data?.success) {

        setStockMessage(

          `${product.name}: stock set to ${response.data.quantity}.`

        );



        await fetchDashboard(false, selectedShop);

      } else {

        setStockError(

          response.data?.message || "Unable to update stock."

        );

      }

    } catch (err) {

      if (!handleAuthError(err)) {

        setStockError(

          err.response?.data?.message ||

            err.response?.data?.detail ||

            "Stock update failed."

        );

      }

    } finally {

      setSavingProductId(null);

    }

  }



  // Add additional units to existing stock

  async function handleAddStock(product) {

    const rawQuantity = addQuantityDrafts[product.id];



    if (rawQuantity === undefined || String(rawQuantity).trim() === "") {

      setStockError("Enter how many units you want to add.");

      return;

    }



    const quantity = Number(rawQuantity);



    if (!Number.isInteger(quantity) || quantity <= 0) {

      setStockError("Additional stock must be a whole number greater than zero.");

      return;

    }



    setSavingProductId(product.id);

    setStockError("");

    setStockMessage("");



    try {

      const response = await axios.patch(

        `${API_BASE_URL}/accounts/admin/dashboard/`,

        {

          shop_id: selectedShop,

          product_id: product.id,

          action: "add",

          quantity,

        },

        { headers: authHeaders }

      );



      if (response.data?.success) {

        setStockMessage(

          `${product.name}: new stock is ${response.data.quantity}.`

        );



        await fetchDashboard(false, selectedShop);

      } else {

        setStockError(

          response.data?.message || "Unable to add stock."

        );

      }

    } catch (err) {

      if (!handleAuthError(err)) {

        setStockError(

          err.response?.data?.message ||

            err.response?.data?.detail ||

            "Could not add stock."

        );

      }

    } finally {

      setSavingProductId(null);

    }

  }



  async function handleDeleteProduct(product) {
    const confirmed = window.confirm(
      `Kya aap "${product.name}" ko deactivate karna chahte hain? Product POS mein visible nahi hona chahiye.`
    );
    if (!confirmed) return;

    setSavingProductId(product.id);
    setStockError("");
    setStockMessage("");

    try {
      // Use the dedicated admin endpoint defined in backend/inventory/urls.py.
      const response = await axios.delete(
        `${API_BASE_URL}/inventory/admin/products/${product.id}/`,
        { headers: authHeaders }
      );

      if (response.status === 200 && response.data?.success) {
        setStockMessage(
          response.data?.message || `${product.name} successfully deactivated.`
        );
        await fetchDashboard(false, selectedShop);
      } else {
        setStockError(
          response.data?.message || "Product deactivate nahi hua."
        );
      }
    } catch (err) {
      // Do not log the admin out from this action; show the actual API error.
      const statusCode = err.response?.status;
      setStockError(
        statusCode === 401
          ? "Delete request unauthorized (401). Admin token/session check karein. Aap logged out nahi kiye gaye."
          : statusCode === 403
          ? "Delete request forbidden (403). Admin permission check karein. Aap logged out nahi kiye gaye."
          : err.response?.data?.message ||
            err.response?.data?.detail ||
            `Product delete failed${statusCode ? ` (HTTP ${statusCode})` : ""}.`
      );
      console.error("Delete product error:", {
        status: statusCode,
        data: err.response?.data,
        url: err.config?.url,
      });
    } finally {
      setSavingProductId(null);
    }
  }

  async function openAddProductModal(mode = "multi") {
    setProductCreateMode(mode);
    setShowAddProduct(true);
    setNewProductError("");
    setNewProductMessage("");
    if (mode === "single" && !selectedShop) {
      setNewProductError("Pehle upar se ek shop select karein. Product sirf usi shop ke POS mein add hoga.");
      return;
    }
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    setNewProductError("");
    setNewProductMessage("");
    if (!newProduct.name.trim() || !newProduct.sku.trim() || newProduct.purchase_price === "" || newProduct.selling_price === "") {
      setNewProductError("Product name, SKU, purchase price aur selling price required hain.");
      return;
    }
    const purchase = Number(newProduct.purchase_price);
    const selling = Number(newProduct.selling_price);
    const minimum = newProduct.minimum_selling_price === "" ? null : Number(newProduct.minimum_selling_price);
    if (!Number.isFinite(purchase) || purchase < 0 || !Number.isFinite(selling) || selling < 0 || (minimum !== null && (!Number.isFinite(minimum) || minimum < 0))) {
      setNewProductError("Prices valid non-negative numbers hone chahiye.");
      return;
    }
    // Send both common shop ID keys so the payload works with either
    // backend naming convention; the API can read shop_id or shop.
    const stocks = productCreateMode === "single"
      ? (selectedShop ? [{ shop_id: Number(selectedShop), shop: Number(selectedShop), quantity: Number(initialStocks[selectedShop] ?? 0) }] : [])
      : shops.filter((shop) => selectedNewShops[shop.id]).map((shop) => ({
          shop_id: Number(shop.id), shop: Number(shop.id), quantity: Number(initialStocks[shop.id] || 0),
        }));
    if (!stocks.length) {
      setNewProductError("Kam se kam ek shop select karein.");
      return;
    }
    for (const item of stocks) {
      if (!Number.isInteger(item.quantity) || item.quantity < 0) {
        setNewProductError("Har shop ki quantity zero ya positive whole number honi chahiye.");
        return;
      }
    }
    setSavingNewProduct(true);
    try {
      const payload = new FormData();
      payload.append("name", newProduct.name.trim());
      payload.append("sku", newProduct.sku.trim());
      payload.append("barcode", newProduct.barcode.trim());
      if (newProduct.category.trim()) payload.append("category_name", newProduct.category.trim());
      payload.append("purchase_price", String(purchase));
      payload.append("selling_price", String(selling));
      if (minimum !== null) payload.append("minimum_selling_price", String(minimum));
      payload.append("description", newProduct.description);
      payload.append("active", String(newProduct.active));
      if (newProductImage) payload.append("image", newProductImage);
      payload.append("shop_stocks", JSON.stringify(stocks));
      // Let the browser/Axios set the multipart boundary automatically.
      // Manually setting Content-Type can cause file uploads to fail on some setups.
      const response = await axios.post(
        `${API_BASE_URL}/inventory/admin/products/create/`,
        payload,
        { headers: authHeaders }
      );
      if (response.data?.success) {
        setNewProductMessage("Product aur selected shops ka stock successfully create ho gaya.");
        setNewProduct({ name: "", sku: "", barcode: "", category: "", purchase_price: "", selling_price: "", minimum_selling_price: "", description: "", active: true });
        setSelectedNewShops({});
        setInitialStocks({});
        setNewProductImage(null);
        await fetchDashboard(false, selectedShop);
        setShowAddProduct(false);
      } else {
        const data = response.data || {};
        setNewProductError(formatCreateProductError(data));
      }
    } catch (err) {
      if (!handleAuthError(err)) {
        const statusCode = err.response?.status;
        const serverData = err.response?.data;
        const serverMessage = formatCreateProductError(serverData);
        setNewProductError(
          serverMessage !== "Product create failed. Backend response nahi mila."
            ? serverMessage
            : statusCode
              ? `Product create failed (HTTP ${statusCode}). Backend logs mein traceback check karein; frontend ko detailed error response nahi mila.`
              : err.message || "Product create failed. Backend endpoint aur fields verify karein."
        );
        console.error("Create product error:", {
          status: statusCode,
          data: serverData,
          url: err.config?.url,
        });
      }
    } finally {
      setSavingNewProduct(false);
    }
  }

  const today = dashboard?.today || {};

  const allTime = dashboard?.all_time || {};

  const products = dashboard?.products || {};

  const stock = dashboard?.stock || {};



  const productItems = Array.isArray(products.items)

    ? products.items

    : [];



  const stockDetails = Array.isArray(products.items) ? products.items : [];
  const soldDetails = Array.isArray(dashboard?.sold_items) ? dashboard.sold_items : [];
  const normalizedDetailSearch = detailSearch.trim().toLowerCase();
  const filteredStockDetails = stockDetails.filter((item) =>
    `${item.product_name || item.name || ""} ${item.sku || ""} ${item.product_id || item.id || ""}`.toLowerCase().includes(normalizedDetailSearch)
  );
  const filteredSoldDetails = soldDetails.filter((item) =>
    `${item.product_name || ""} ${item.sku || ""} ${item.invoice_number || ""} ${item.product_id || ""}`.toLowerCase().includes(normalizedDetailSearch)
  );

  const recentSales = dashboard?.recent_sales || [];

  const saleTypeSales = dashboard?.sale_type_sales || [];



  const retailSales = saleTypeSales.find(

    (item) => item.sale_type === "RETAIL"

  ) || { sales_count: 0, revenue: 0 };



  const wholesaleSales = saleTypeSales.find(

    (item) => item.sale_type === "WHOLESALE"

  ) || { sales_count: 0, revenue: 0 };



  const filteredProducts = productItems.filter((product) => {

    const query = productSearch.trim().toLowerCase();



    if (!query) return true;



    return (

      String(product.name || "").toLowerCase().includes(query) ||

      String(product.id || "").includes(query)

    );

  });



  return (

    <div

      id="dashboard-top"

      className="min-h-screen bg-slate-50 text-slate-900"

    >
      <style>{`button:not(:disabled), a, [role="button"], label:has(input[type="checkbox"]), input[type="file"] { cursor: pointer; } button:disabled { cursor: not-allowed; }`}</style>

      {sidebarOpen && (

        <button

          type="button"

          aria-label="Close sidebar"

          onClick={() => setSidebarOpen(false)}

          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"

        />

      )}



      {/* Sidebar */}

      <aside

        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 lg:translate-x-0 ${

          sidebarOpen ? "translate-x-0" : "-translate-x-full"

        }`}

      >

        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-6">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">

              <Store size={22} />

            </div>



            <div>

              <h1 className="text-xl font-extrabold tracking-tight">

                ToyMall

              </h1>

              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">

                Admin Portal

              </p>

            </div>

          </div>



          <button

            type="button"

            onClick={() => setSidebarOpen(false)}

            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"

            aria-label="Close menu"

          >

            <X size={20} />

          </button>

        </div>



        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">

          <button

            type="button"

            onClick={() => goToSection("dashboard-top")}

            className="flex w-full items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-left text-sm font-semibold text-white"

          >

            <LayoutDashboard size={18} />

            Dashboard

          </button>



          <button

            type="button"

            onClick={() => { setSidebarOpen(false); openAddProductModal("multi"); }}

            className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"

          >

            <Package size={18} />

            Add Product

          </button>



          <button

            type="button"

            onClick={() => goToSection("product-inventory")}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"

          >

            <Boxes size={18} />

            Stock

          </button>



          <button

            type="button"

            onClick={() => goToSection("sales-summary")}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"

          >

            <ShoppingCart size={18} />

            Sales

          </button>



          <button

            type="button"

            onClick={() => goToSection("recent-bills")}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"

          >

            <FileText size={18} />

            Invoices

          </button>



          <button

            type="button"

            onClick={() => goToSection("sales-summary")}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium text-slate-600 transition hover:bg-slate-100"

          >

            <BarChart3 size={18} />

            Reports

          </button>

        </nav>



        <div className="border-t border-slate-200 p-4">

          <div className="mb-3 rounded-xl bg-slate-50 p-3">

            <p className="text-xs text-slate-400">Logged in as</p>

            <p className="mt-1 truncate text-sm font-semibold text-slate-800">

              {admin?.username || "Admin"}

            </p>

          </div>



          <button

            type="button"

            onClick={handleLogout}

            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"

          >

            <LogOut size={18} />

            Logout

          </button>

        </div>

      </aside>



      {/* Main content */}

      <div className="lg:pl-72">

        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

          <div className="flex min-h-20 flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">

            <div className="flex items-center gap-3">

              <button

                type="button"

                onClick={() => setSidebarOpen(true)}

                className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"

                aria-label="Open menu"

              >

                <Menu size={22} />

              </button>



              <div>

                <h1 className="text-xl font-bold text-slate-900">

                  Admin Dashboard

                </h1>

                <p className="hidden text-xs text-slate-500 sm:block">

                  Shop-wise sales and inventory management

                </p>

              </div>

            </div>



            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">

              <label

                htmlFor="shop-select"

                className="text-sm font-semibold text-slate-600"

              >

                Shop

              </label>



              <select

                id="shop-select"

                value={selectedShop}

                onChange={handleShopChange}

                disabled={shopsLoading || shops.length === 0}

                className="min-w-56 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-100"

              >

                <option value="">

                  {shopsLoading ? "Loading shops..." : "Select a shop"}

                </option>



                {shops.map((shop) => (

                  <option key={shop.id} value={shop.id}>

                    {shop.name} (

                    {shop.shop_type === "WHOLESALE"

                      ? "Wholesale"

                      : "Retail"}

                    )

                  </option>

                ))}

              </select>



              <button

                type="button"

                onClick={() => fetchDashboard(true)}

                disabled={!selectedShop || loading || refreshing}

                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"

              >

                <RefreshCw

                  size={16}

                  className={refreshing ? "animate-spin" : ""}

                />

                Refresh

              </button>

            </div>

          </div>

        </header>



        <main className="p-4 sm:p-6 lg:p-8">
          {showAddProduct && (
            <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6">
              <div className="my-auto w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div><h2 className="text-lg font-bold text-slate-900">Add New Product</h2><p className="text-sm text-slate-500">{productCreateMode === "single" ? `Product sirf ${selectedShopInfo?.name || "selected shop"} ke POS mein add hoga.` : "Product add karein aur zarurat ke mutabiq multiple shops ka opening stock set karein."}</p></div>
                  <button type="button" onClick={() => setShowAddProduct(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={20} /></button>
                </div>
                <form onSubmit={handleCreateProduct} className="space-y-5 p-5">
                  {newProductError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{newProductError}</div>}
                  {newProductMessage && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{newProductMessage}</div>}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">Product name *<input required value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">SKU *<input required value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Barcode<input value={newProduct.barcode} onChange={(e) => setNewProduct({...newProduct, barcode:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Category (optional)<input type="text" value={newProduct.category} onChange={(e) => setNewProduct({...newProduct, category:e.target.value})} placeholder="Category ka naam likhein (optional)" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /><span className="mt-1 block text-xs text-slate-500">Category blank chhod sakte hain.</span></label>
                    <label className="text-sm font-medium text-slate-700">Purchase price *<input required type="number" min="0" step="0.01" value={newProduct.purchase_price} onChange={(e) => setNewProduct({...newProduct, purchase_price:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Selling price *<input required type="number" min="0" step="0.01" value={newProduct.selling_price} onChange={(e) => setNewProduct({...newProduct, selling_price:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Minimum selling price<input type="number" min="0" step="0.01" value={newProduct.minimum_selling_price} onChange={(e) => setNewProduct({...newProduct, minimum_selling_price:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700">Description<input value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
                    <label className="text-sm font-medium text-slate-700 sm:col-span-2">Product image
                      <input type="file" accept="image/*" onChange={(e) => setNewProductImage(e.target.files?.[0] || null)} className="mt-1 block w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
                      {newProductImage && <span className="mt-1 block text-xs text-slate-500">Selected: {newProductImage.name}</span>}
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    {productCreateMode === "single" ? (
                      <div><h3 className="font-bold text-slate-900">Initial stock — {selectedShopInfo?.name || "Selected shop"}</h3><p className="mb-3 text-xs text-slate-500">Ye product sirf selected shop ke POS mein available hoga.</p><label className="block max-w-xs text-xs font-semibold text-slate-500">Initial quantity<input type="number" min="0" step="1" value={initialStocks[selectedShop] ?? "0"} onChange={(e) => setInitialStocks({...initialStocks, [selectedShop]:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" /></label></div>
                    ) : (
                      <><div className="mb-3"><h3 className="font-bold text-slate-900">Shop-wise opening stock</h3><p className="text-xs text-slate-500">Jin shops mein product rakhna hai unko select karein.</p></div>
                      {shopsLoading ? <p className="text-sm text-slate-500">Loading shops...</p> : shops.length === 0 ? <p className="text-sm text-amber-700">Koi shop available nahi hai.</p> : <div className="space-y-3">{shops.map((shop) => <div key={shop.id} className="grid items-center gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_150px]">
                        <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={Boolean(selectedNewShops[shop.id])} onChange={(e) => setSelectedNewShops({...selectedNewShops, [shop.id]:e.target.checked})} className="h-4 w-4 rounded border-slate-300" />{shop.name}</label>
                        <label className="text-xs font-semibold text-slate-500">Initial quantity<input type="number" min="0" step="1" disabled={!selectedNewShops[shop.id]} value={initialStocks[shop.id] ?? "0"} onChange={(e) => setInitialStocks({...initialStocks, [shop.id]:e.target.value})} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100" /></label>
                      </div>)}</div>}</>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={newProduct.active} onChange={(e) => setNewProduct({...newProduct, active:e.target.checked})} className="h-4 w-4" />Product active / POS mein visible</label>
                  <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setShowAddProduct(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                    <button type="submit" disabled={savingNewProduct} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{savingNewProduct ? "Creating..." : "Create Product & Stock"}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {shopError && (

            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

              {shopError}

              <button

                type="button"

                onClick={() => window.location.reload()}

                className="ml-2 font-semibold underline"

              >

                Retry

              </button>

            </div>

          )}



          {!shopsLoading && !shopError && shops.length === 0 && (

            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">

              No active shops found.

            </div>

          )}



          {!selectedShop ? (

            <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">

              <Store size={36} className="mx-auto text-slate-700" />

              <h2 className="mt-5 text-xl font-bold">

                Welcome, {admin?.first_name || admin?.username || "Admin"}!

              </h2>

              <p className="mt-2 text-sm text-slate-500">

                Dashboard dekhne ke liye upar dropdown se shop select karo.

              </p>

            </section>

          ) : loading && !dashboard ? (

            <div className="flex min-h-64 items-center justify-center">

              <p className="text-sm font-medium text-slate-600">

                Loading {selectedShopInfo?.name || "shop"} dashboard...

              </p>

            </div>

          ) : error && !dashboard ? (

            <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">

              <AlertTriangle className="mx-auto text-red-500" size={28} />

              <h2 className="mt-3 text-lg font-bold">

                Dashboard unavailable

              </h2>

              <p className="mt-2 text-sm text-slate-500">{error}</p>

              <button

                type="button"

                onClick={() => fetchDashboard()}

                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"

              >

                <RefreshCw size={16} />

                Try again

              </button>

            </div>

          ) : dashboard ? (

            <>

              {error && (

                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                  {error}

                </div>

              )}



              {/* Selected shop banner */}

              <section className="mb-6 rounded-2xl bg-slate-900 p-6 text-white shadow-sm sm:p-7">

                <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

                  <div>

                    <p className="text-sm font-medium text-slate-300">

                      Selected shop

                    </p>

                    <h2 className="mt-1 text-2xl font-bold sm:text-3xl">

                      {selectedShopInfo?.name ||

                        dashboard.shop?.name ||

                        "Shop Dashboard"}

                    </h2>

                    <p className="mt-2 text-sm text-slate-300">

                      {selectedShopInfo?.shop_type === "WHOLESALE"

                        ? "Wholesale"

                        : "Retail"}{" "}

                      · POS and inventory overview

                    </p>

                  </div>



                  <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3">

                    <TrendingUp size={21} />

                    <div>

                      <p className="text-xs text-slate-300">

                        All-time revenue

                      </p>

                      <p className="text-lg font-bold">

                        {formatCurrency(allTime.revenue)}

                      </p>

                    </div>

                  </div>

                </div>

              </section>



              {/* Date filter */}

              <section

                id="sales-summary"

                className="mb-6 scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"

              >

                <SectionHeader

                  icon={CalendarDays}

                  title="Date-wise Sales Report"

                  subtitle="Choose a date or a date range to filter sales and invoices"

                />



                <form

                  onSubmit={handleApplyDateFilter}

                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"

                >

                  <div>

                    <label

                      htmlFor="date-from"

                      className="mb-2 block text-sm font-semibold text-slate-700"

                    >

                      From Date

                    </label>

                    <input

                      id="date-from"

                      type="date"

                      value={dateFrom}

                      max={getLocalDate()}

                      onChange={(event) => setDateFrom(event.target.value)}

                      required

                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"

                    />

                  </div>



                  <div>

                    <label

                      htmlFor="date-to"

                      className="mb-2 block text-sm font-semibold text-slate-700"

                    >

                      To Date

                    </label>

                    <input

                      id="date-to"

                      type="date"

                      value={dateTo}

                      min={dateFrom || undefined}

                      max={getLocalDate()}

                      onChange={(event) => setDateTo(event.target.value)}

                      required

                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"

                    />

                  </div>



                  <div className="flex items-end">

                    <button

                      type="submit"

                      disabled={loading}

                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"

                    >

                      <Search size={17} />

                      Apply Filter

                    </button>

                  </div>



                  <div className="flex items-end">

                    <button

                      type="button"

                      onClick={handleResetDateFilter}

                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"

                    >

                      Today

                    </button>

                  </div>

                </form>



                <p className="mt-3 text-xs text-slate-500">

                  Showing sales from {appliedDateFrom} to {appliedDateTo}.

                  Current stock always shows the latest quantity.

                </p>

              </section>



              {/* Sales summary cards */}

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard

                  title="Sales in Selected Period"

                  value={formatCurrency(today.revenue)}

                  subtitle={`${today.sales_count || 0} bills in selected period`}

                  icon={IndianRupee}

                  iconClass="bg-emerald-50 text-emerald-600"

                />



                <StatCard

                  title="Bills in Selected Period"

                  value={today.invoice_count || 0}

                  subtitle="POS invoices"

                  icon={Receipt}

                  iconClass="bg-violet-50 text-violet-600"

                />



                <StatCard

                  title="Items Sold in Period"

                  value={today.items_sold || 0}

                  subtitle="Total units sold"

                  icon={ShoppingCart}

                  iconClass="bg-blue-50 text-blue-600"

                  onClick={() => { setDetailSearch(""); setDetailModal("sold"); }}

                />



                <StatCard

                  title="Current Stock"

                  value={stock.total_units || 0}

                  subtitle={`${stock.total_stock_records || 0} stock records`}

                  icon={Boxes}

                  iconClass="bg-cyan-50 text-cyan-600"

                  onClick={() => { setDetailSearch(""); setDetailModal("stock"); }}

                />

              </section>



              <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                <StatCard

                  title="Out of Stock"

                  value={stock.out_of_stock_items || 0}

                  subtitle="Active products with zero stock"

                  icon={AlertTriangle}

                  iconClass="bg-red-50 text-red-600"

                />



                <StatCard

                  title="Low Stock"

                  value={stock.low_stock_items || 0}

                  subtitle="Products with 1–5 units"

                  icon={Boxes}

                  iconClass="bg-amber-50 text-amber-600"

                />



                <StatCard

                  title="Active Products"

                  value={products.active_count || 0}

                  subtitle="Active products in catalogue"

                  icon={Package}

                  iconClass="bg-indigo-50 text-indigo-600"

                />



                <StatCard

                  title="All-Time Bills"

                  value={allTime.sales_count || 0}

                  subtitle={`${allTime.items_sold || 0} units sold overall`}

                  icon={FileText}

                  iconClass="bg-pink-50 text-pink-600"

                />

              </section>



              {/* Sales and payment summary */}

              <section className="mt-6 grid gap-6 xl:grid-cols-3">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">

                  <SectionHeader

                    icon={Store}

                    title="Selected Shop Details"

                    subtitle={`Sales from ${appliedDateFrom} to ${appliedDateTo}`}

                  />



                  <div className="grid gap-3 sm:grid-cols-2">

                    <div className="rounded-xl border border-slate-200 p-4">

                      <p className="text-sm text-slate-500">

                        Retail Sales

                      </p>

                      <p className="mt-2 text-xl font-bold">

                        {formatCurrency(retailSales.revenue)}

                      </p>

                      <p className="mt-1 text-xs text-slate-500">

                        {retailSales.sales_count || 0} bills

                      </p>

                    </div>



                    <div className="rounded-xl border border-slate-200 p-4">

                      <p className="text-sm text-slate-500">

                        Wholesale Sales

                      </p>

                      <p className="mt-2 text-xl font-bold">

                        {formatCurrency(wholesaleSales.revenue)}

                      </p>

                      <p className="mt-1 text-xs text-slate-500">

                        {wholesaleSales.sales_count || 0} bills

                      </p>

                    </div>

                  </div>



                  <div className="mt-4 rounded-xl bg-slate-50 p-4">

                    <p className="text-sm font-semibold text-slate-700">

                      Payment Summary

                    </p>



                    {(dashboard.payment_summary || []).length === 0 ? (

                      <p className="mt-2 text-sm text-slate-500">

                        No payments in this date range.

                      </p>

                    ) : (

                      <div className="mt-3 space-y-3">

                        {dashboard.payment_summary.map((item) => (

                          <div

                            key={item.payment_method}

                            className="flex flex-wrap items-center justify-between gap-2 text-sm"

                          >

                            <span className="text-slate-600">

                              {item.payment_method} ({item.sales_count} bills)

                            </span>

                            <span className="font-bold">

                              {formatCurrency(item.revenue)}

                            </span>

                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                </div>



                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

                  <SectionHeader

                    icon={Boxes}

                    title="Stock Status"

                    subtitle="Current stock in this shop"

                  />



                  <div className="space-y-4">

                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">

                        Total units

                      </span>

                      <span className="font-bold">

                        {stock.total_units || 0}

                      </span>

                    </div>



                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">

                        Products listed

                      </span>

                      <span className="font-bold">

                        {productItems.length}

                      </span>

                    </div>



                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">

                        Out of stock

                      </span>

                      <span className="font-bold text-red-600">

                        {stock.out_of_stock_items || 0}

                      </span>

                    </div>



                    <div className="flex items-center justify-between">

                      <span className="text-sm text-slate-500">

                        Low stock (1–5)

                      </span>

                      <span className="font-bold text-amber-600">

                        {stock.low_stock_items || 0}

                      </span>

                    </div>

                  </div>

                </div>

              </section>



              {/* Product inventory */}

              <section

                id="product-inventory"

                className="mt-6 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"

              >

                <div className="p-5 pb-3">

                  <SectionHeader

                    icon={Package}

                    title="Shop Product Inventory"

                    subtitle={`All active products and their stock in ${

                      selectedShopInfo?.name || "selected shop"

                    }`}

                                        action={
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {productItems.length} products
                        </span>
                        <button type="button" onClick={() => openAddProductModal("single")} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
                          <Plus size={16} /> Add Product
                        </button>
                      </div>
                    }

                  />



                  <div className="relative">

                    <Search

                      size={18}

                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

                    />

                    <input

                      type="text"

                      value={productSearch}

                      onChange={(event) =>

                        setProductSearch(event.target.value)

                      }

                      placeholder="Search product name or product ID..."

                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"

                    />

                  </div>

                </div>



                {stockMessage && (

                  <div className="mx-5 mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">

                    <CheckCircle size={18} className="mt-0.5 shrink-0" />

                    <span>{stockMessage}</span>

                  </div>

                )}



                {stockError && (

                  <div className="mx-5 mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    {stockError}

                  </div>

                )}



                {filteredProducts.length === 0 ? (

                  <div className="px-5 pb-5">

                    <EmptyState message="No products found for this search." />

                  </div>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[850px]">

                      <thead>

                        <tr className="border-y border-slate-100 bg-slate-50">

                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                            Product

                          </th>

                          <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">

                            Current Stock

                          </th>

                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                            Set Exact Stock

                          </th>

                          <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">

                            Add Stock

                          </th>

                          <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">

                            Action

                          </th>

                        </tr>

                      </thead>



                      <tbody>

                        {filteredProducts.map((product) => {

                          const currentQuantity = Number(

                            product.quantity || 0

                          );



                          return (

                            <tr

                              key={product.id}

                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"

                            >

                              <td className="px-5 py-4">

                                <p className="font-semibold text-slate-900">

                                  {product.name}

                                </p>

                                <p className="mt-1 text-xs text-slate-400">

                                  Product ID: {product.id}

                                </p>

                              </td>



                              <td className="px-5 py-4 text-center">

                                <span

                                  className={`inline-flex min-w-16 items-center justify-center rounded-full px-3 py-1.5 text-sm font-bold ${

                                    currentQuantity === 0

                                      ? "bg-red-100 text-red-700"

                                      : currentQuantity <= 5

                                      ? "bg-amber-100 text-amber-700"

                                      : "bg-emerald-100 text-emerald-700"

                                  }`}

                                >

                                  {currentQuantity}

                                </span>

                              </td>



                              <td className="px-5 py-4">

                                <div className="flex items-center gap-2">

                                  <input

                                    type="number"

                                    min="0"

                                    step="1"

                                    aria-label={`Set stock for ${product.name}`}

                                    value={

                                      quantityDrafts[product.id] ??

                                      String(currentQuantity)

                                    }

                                    onChange={(event) =>

                                      setQuantityDrafts((previous) => ({

                                        ...previous,

                                        [product.id]: event.target.value,

                                      }))

                                    }

                                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"

                                  />



                                  <button

                                    type="button"

                                    onClick={() => handleSetStock(product)}

                                    disabled={

                                      savingProductId === product.id

                                    }

                                    title="Set exact stock quantity"

                                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"

                                  >

                                    <Save size={14} />

                                    Save

                                  </button>

                                </div>

                              </td>



                              <td className="px-5 py-4">

                                <div className="flex items-center gap-2">

                                  <input

                                    type="number"

                                    min="1"

                                    step="1"

                                    aria-label={`Additional stock for ${product.name}`}

                                    placeholder="Units"

                                    value={

                                      addQuantityDrafts[product.id] ?? ""

                                    }

                                    onChange={(event) =>

                                      setAddQuantityDrafts((previous) => ({

                                        ...previous,

                                        [product.id]: event.target.value,

                                      }))

                                    }

                                    className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-500"

                                  />



                                  <button

                                    type="button"

                                    onClick={() => handleAddStock(product)}

                                    disabled={

                                      savingProductId === product.id

                                    }

                                    title="Add units to existing stock"

                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"

                                  >

                                    <Plus size={14} />

                                    Add

                                  </button>

                                </div>

                              </td>

                              <td className="px-5 py-4 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteProduct(product)}
                                  disabled={savingProductId === product.id}
                                  title="Deactivate product"
                                  className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 size={14} />
                                  {savingProductId === product.id ? "Please wait..." : "Delete"}
                                </button>
                              </td>

                            </tr>

                          );

                        })}

                      </tbody>

                    </table>

                  </div>

                )}



                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">

                  <p className="text-xs text-slate-500">

                    Save sets the exact stock quantity. Add increases the

                    current quantity by the entered number of units. Changes

                    apply only to the selected shop.

                  </p>

                </div>

              </section>



              {/* Recent bills / invoices */}

              <section

                id="recent-bills"

                className="mt-6 scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"

              >

                <div className="p-5 pb-3">

                  <SectionHeader

                    icon={Receipt}

                    title="Sales & Invoices"

                    subtitle={`Bills from ${appliedDateFrom} to ${appliedDateTo}`}

                    action={

                      <span className="text-xs font-semibold text-slate-500">

                        {recentSales.length} shown

                      </span>

                    }

                  />

                </div>



                {recentSales.length === 0 ? (

                  <div className="px-5 pb-5">

                    <EmptyState message="No sales found for this shop and date range." />

                  </div>

                ) : (

                  <div className="overflow-x-auto">

                    <table className="w-full min-w-[760px]">

                      <thead>

                        <tr className="border-y border-slate-100 bg-slate-50/70">

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Invoice

                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Type

                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Payment

                          </th>

                          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Date

                          </th>

                          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">

                            Total

                          </th>

                        </tr>

                      </thead>



                      <tbody>

                        {recentSales.map((sale) => (

                          <tr

                            key={sale.id}

                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50"

                          >

                            <td className="px-5 py-4 text-sm font-semibold text-slate-800">

                              {sale.invoice_number || "-"}

                            </td>



                            <td className="px-5 py-4">

                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">

                                {sale.sale_type || "-"}

                              </span>

                            </td>



                            <td className="px-5 py-4 text-sm text-slate-600">

                              {sale.payment_method || "-"}

                            </td>



                            <td className="px-5 py-4 text-sm text-slate-600">

                              {formatDateTime(sale.created_at)}

                            </td>



                            <td className="px-5 py-4 text-right text-sm font-bold">

                              {formatCurrency(sale.total)}

                            </td>

                          </tr>

                        ))}

                      </tbody>

                    </table>

                  </div>

                )}

              </section>



              {detailModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailModal(null); }}>
                  <section role="dialog" aria-modal="true" aria-labelledby="dashboard-detail-title" className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                    <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{selectedShopInfo?.name || dashboard?.shop?.name || "Selected shop"}</p>
                        <h2 id="dashboard-detail-title" className="mt-1 text-xl font-bold text-slate-900">{detailModal === "stock" ? "Current Stock Details" : "Items Sold in Selected Period"}</h2>
                        <p className="mt-1 text-sm text-slate-500">{detailModal === "stock" ? "Latest stock quantity for each product in this shop." : `Sales from ${appliedDateFrom} to ${appliedDateTo}.`}</p>
                      </div>
                      <button type="button" onClick={() => setDetailModal(null)} aria-label="Close details" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"><X size={22} /></button>
                    </header>
                    <div className="border-b border-slate-100 p-4 sm:px-6">
                      <div className="relative">
                        <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={detailSearch} onChange={(event) => setDetailSearch(event.target.value)} placeholder={detailModal === "stock" ? "Search product name, SKU or ID..." : "Search product, SKU or invoice..."} className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
                      </div>
                    </div>
                    <div className="overflow-auto">
                      {detailModal === "stock" ? (
                        filteredStockDetails.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No stock products match your search.</div> : (
                          <table className="w-full min-w-[620px] text-left">
                            <thead className="sticky top-0 bg-white shadow-sm"><tr className="text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold sm:px-6">Product</th><th className="px-5 py-3 font-semibold">SKU / ID</th><th className="px-5 py-3 text-right font-semibold sm:px-6">Available Qty</th><th className="px-5 py-3 font-semibold">Status</th></tr></thead>
                            <tbody>{filteredStockDetails.map((item) => { const quantity = Number(item.quantity || 0); return <tr key={item.id || item.product_id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800 sm:px-6">{item.product_name || item.name}</td><td className="px-5 py-4 text-sm text-slate-500">{item.sku || "—"} <span className="text-xs">({item.product_id || item.id})</span></td><td className="px-5 py-4 text-right text-base font-bold text-slate-900 sm:px-6">{quantity}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quantity === 0 ? "bg-red-100 text-red-700" : quantity <= 5 ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{quantity === 0 ? "Out of stock" : quantity <= 5 ? "Low stock" : "In stock"}</span></td></tr>; })}</tbody>
                          </table>
                        )
                      ) : (
                        filteredSoldDetails.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No sold items found for this date range.</div> : (
                          <table className="w-full min-w-[760px] text-left">
                            <thead className="sticky top-0 bg-white shadow-sm"><tr className="text-xs uppercase tracking-wide text-slate-500"><th className="px-5 py-3 font-semibold sm:px-6">Product</th><th className="px-5 py-3 font-semibold">SKU</th><th className="px-5 py-3 font-semibold">Invoice</th><th className="px-5 py-3 font-semibold">Sale Date</th><th className="px-5 py-3 text-right font-semibold sm:px-6">Qty Sold</th></tr></thead>
                            <tbody>{filteredSoldDetails.map((item, index) => <tr key={`${item.sale_id || item.invoice_number}-${item.product_id}-${index}`} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-800 sm:px-6">{item.product_name || "Unknown product"}</td><td className="px-5 py-4 text-sm text-slate-500">{item.sku || "—"}</td><td className="px-5 py-4 text-sm font-medium text-blue-700">{item.invoice_number || (item.sale_id ? `#${item.sale_id}` : "—")}</td><td className="px-5 py-4 text-sm text-slate-500">{formatDateTime(item.created_at)}</td><td className="px-5 py-4 text-right font-bold text-slate-900 sm:px-6">{item.quantity_sold ?? item.quantity ?? 0}</td></tr>)}</tbody>
                          </table>
                        )
                      )}
                    </div>
                    <footer className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:px-6"><p className="text-xs text-slate-500">{detailModal === "stock" ? `${filteredStockDetails.length} products shown` : `${filteredSoldDetails.length} sale line(s) shown`}</p><button type="button" onClick={() => setDetailModal(null)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Close</button></footer>
                  </section>
                </div>
              )}

              <footer className="py-8 text-center">

                <p className="text-xs text-slate-400">

                  ToyMall Admin Portal · Shop-wise sales and inventory

                </p>

              </footer>

            </>

          ) : null}

        </main>

      </div>

    </div>

  );

}
