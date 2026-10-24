
import { useEffect, useState } from "react";
import axios from "axios";

import {
  Store,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import ShopPortal from "./pages/sales/ShopPortal";

import AdminLogin from "./pages/admin/AdminLogin";
import Dashboard from "./pages/dashboard/Dashboard";
import ProductManagement from "./pages/admin/ProductManagement";

import {
  ShopAuthProvider,
  useShopAuth,
} from "./context/ShopAuthContext";

import {
  AdminAuthProvider,
  useAdminAuth,
} from "./context/AdminAuthContext";

const API_BASE_URL = "https://toymall-inventory-pos.onrender.com/api";


/* =========================================================
   SHOP SELECTION
========================================================= */

function ShopSelection({ onShopSelected, openingShop }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/shops/`
      );

      if (
        response.data?.success &&
        Array.isArray(response.data.shops)
      ) {
        setShops(response.data.shops);
      } else {
        throw new Error(
          "Invalid shop API response format."
        );
      }
    } catch (err) {
      console.error("Shop API error:", err);

      setError(
        "Unable to load shops. Please make sure the ToyMall backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-[-180px] right-[-100px] h-[450px] w-[450px] rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute left-[-150px] top-1/2 h-[350px] w-[350px] rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-6xl">
          <div className="mb-10 text-center">
            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-blue-950/30">
                <Store className="h-8 w-8 text-slate-900" />
              </div>
            </div>

            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
              Welcome to
            </p>

            <h1
              className="text-4xl font-extrabold tracking-tight sm:text-5xl"
              style={{
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Toy<span className="text-blue-400">Mall</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
              Select your shop to continue to the billing
              and inventory system.
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-400 shadow-lg backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Shop Selection</span>
            </div>
          </div>

          {loading && (
            <div className="flex min-h-48 items-center justify-center">
              <div className="flex items-center gap-3 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                <span>Loading shops...</span>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="mx-auto max-w-xl rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-center shadow-xl">
              <div className="mb-4 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
              </div>

              <h2 className="text-lg font-semibold text-red-300">
                Unable to Load Shops
              </h2>

              <p className="mt-2 text-sm leading-6 text-red-300/80">
                {error}
              </p>

              <button
                type="button"
                onClick={fetchShops}
                className="mt-5 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 active:scale-95"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && shops.length > 0 && (
            <div className="mx-auto max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <label
                htmlFor="shop-select"
                className="mb-3 block text-sm font-semibold text-slate-300"
              >
                Select Shop
              </label>

              <select
                id="shop-select"
                defaultValue=""
                disabled={openingShop}
                onChange={(event) => {
                  const shopId = Number(
                    event.target.value
                  );

                  const selected = shops.find(
                    (item) => item.id === shopId
                  );

                  if (selected) {
                    onShopSelected(selected);
                  }
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
              >
                <option value="" disabled>
                  Choose your shop
                </option>

                {shops.map((shop) => (
                  <option
                    key={shop.id}
                    value={shop.id}
                  >
                    {shop.name}
                    {shop.shop_type === "WHOLESALE"
                      ? " — Wholesale"
                      : " — Retail"}
                  </option>
                ))}
              </select>

              {openingShop && (
                <p className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening selected shop...
                </p>
              )}

              <p className="mt-4 text-center text-xs text-slate-500">
                Select a shop to open its POS.
              </p>
            </div>
          )}

          {!loading && !error && shops.length === 0 && (
            <p className="text-center text-slate-400">
              No active shops found.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}


/* =========================================================
   SHOP APP — NO PIN SCREEN
========================================================= */

function ShopAuthenticatedApp() {
  const {
    isAuthenticated,
    shop,
    login,
  } = useShopAuth();

  const [openingShop, setOpeningShop] = useState(false);
  const [error, setError] = useState("");

  const openSelectedShop = async (selectedShop) => {
    try {
      setOpeningShop(true);
      setError("");

      const response = await axios.post(
        `${API_BASE_URL}/shops/open-session/`,
        {
          shop_id: selectedShop.id,
        }
      );

      if (
        response.data?.success &&
        response.data?.token &&
        response.data?.shop
      ) {
        login(
          response.data.token,
          response.data.shop
        );
      } else {
        throw new Error(
          "The server did not return a valid shop session."
        );
      }
    } catch (err) {
      console.error("Open shop error:", err);

      setError(
        err.response?.data?.message ||
        err.message ||
        "Unable to open the selected shop."
      );
    } finally {
      setOpeningShop(false);
    }
  };

  if (isAuthenticated && shop) {
    return <ShopPortal />;
  }

  return (
    <>
      <ShopSelection
        onShopSelected={openSelectedShop}
        openingShop={openingShop}
      />

      {error && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[90%] max-w-lg -translate-x-1/2 rounded-xl border border-red-500/30 bg-red-950 p-4 text-sm text-white shadow-xl">
          {error}

          <button
            type="button"
            className="ml-3 font-bold underline"
            onClick={() => setError("")}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}


/* =========================================================
   ADMIN ROUTE
========================================================= */

function AdminRoute() {
  const {
    isAuthenticated,
  } = useAdminAuth();

  if (!isAuthenticated) {
    return <AdminLogin />;
  }

  const pathname = window.location.pathname;

  if (pathname === "/admin-panel/products") {
    return <ProductManagement />;
  }

  return <Dashboard />;
}


/* =========================================================
   ROOT APP
========================================================= */

function App() {
  const pathname = window.location.pathname;

  const isAdminRoute =
    pathname === "/admin-panel" ||
    pathname.startsWith("/admin-panel/");

  if (isAdminRoute) {
    return (
      <AdminAuthProvider>
        <AdminRoute />
      </AdminAuthProvider>
    );
  }

  return (
    <ShopAuthProvider>
      <ShopAuthenticatedApp />
    </ShopAuthProvider>
  );
}


export default App;
