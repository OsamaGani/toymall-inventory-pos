import { useEffect, useMemo, useRef, useState } from "react";

import axios from "axios";

import {
  ArrowLeft,
  Barcode,
  Edit3,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";

import { useAdminAuth } from "../../context/AdminAuthContext";


const API_BASE_URL = "http://127.0.0.1:8000/api";


const EMPTY_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  purchase_price: "",
  selling_price: "",
  minimum_selling_price: "",
  description: "",
};


function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}


function getListData(data) {
  if (Array.isArray(data)) {
    return data;
  }

  return data?.results || data?.products || [];
}


export default function ProductManagement() {
  const { authHeaders, logout } = useAdminAuth();

  const fileInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");

  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");


  // =========================================================
  // LOAD PRODUCTS + CATEGORIES
  // =========================================================

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [productsResponse, categoriesResponse] =
        await Promise.all([
          axios.get(`${API_BASE_URL}/products/`, {
            headers: authHeaders,
          }),

          axios.get(`${API_BASE_URL}/products/categories/`, {
            headers: authHeaders,
          }),
        ]);

      setProducts(
        getListData(productsResponse.data)
      );

      setCategories(
        getListData(categoriesResponse.data)
      );

    } catch (err) {
      console.error(
        "Product management error:",
        err
      );

      if (err.response?.status === 401) {
        logout();
        window.location.href = "/admin-panel";
        return;
      }

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          "Failed to load product data."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);


  // =========================================================
  // FILTER PRODUCTS
  // =========================================================

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) => {
      return (
        String(product.name || "")
          .toLowerCase()
          .includes(query) ||

        String(product.sku || "")
          .toLowerCase()
          .includes(query) ||

        String(product.barcode || "")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [products, search]);


  // =========================================================
  // OPEN ADD MODAL
  // =========================================================

  const openAddModal = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);

    setSelectedImage(null);
    setImagePreview("");
    setImageError("");

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowModal(true);
  };


  // =========================================================
  // OPEN EDIT MODAL
  // =========================================================

  const openEditModal = (product) => {
    setEditingProduct(product);

    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      category: product.category || "",
      purchase_price: product.purchase_price || "",
      selling_price: product.selling_price || "",
      minimum_selling_price:
        product.minimum_selling_price || "",
      description: product.description || "",
    });

    setSelectedImage(null);
    setImagePreview(product.image_url || "");
    setImageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setError("");
    setSuccess("");

    setShowModal(true);
  };


  // =========================================================
  // CLOSE MODAL
  // =========================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingProduct(null);

    setForm(EMPTY_FORM);

    setSelectedImage(null);
    setImagePreview("");
    setImageError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  // =========================================================
  // HANDLE FORM CHANGE
  // =========================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };


  // =========================================================
  // HANDLE IMAGE SELECT
  // =========================================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setImageError("");

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setImageError(
        "Please select a JPG, JPEG, PNG or WEBP image."
      );

      event.target.value = "";

      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setImageError(
        "Image size must be less than 5 MB."
      );

      event.target.value = "";

      return;
    }

    setSelectedImage(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };


  // =========================================================
  // REMOVE SELECTED IMAGE
  // =========================================================

  const removeSelectedImage = () => {
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (editingProduct?.image_url) {
      setImagePreview(editingProduct.image_url);
    } else {
      setImagePreview("");
    }
  };


  // =========================================================
  // SUBMIT PRODUCT
  // =========================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setImageError("");


    // -------------------------------------------------------
    // BASIC VALIDATION
    // -------------------------------------------------------

    if (!form.name.trim()) {
      setError("Product name is required.");
      return;
    }

    if (!form.sku.trim()) {
      setError(
        "Product code / SKU is required."
      );
      return;
    }

    if (!form.barcode.trim()) {
      setError("Barcode is required.");
      return;
    }

    if (!form.category) {
      setError("Please select a category.");
      return;
    }

    if (
      form.purchase_price === "" ||
      form.selling_price === ""
    ) {
      setError(
        "Purchase price and selling price are required."
      );
      return;
    }

    if (
      form.minimum_selling_price !== "" &&
      Number(form.minimum_selling_price) >
        Number(form.selling_price)
    ) {
      setError(
        "Minimum selling price cannot be greater than selling price."
      );
      return;
    }


    // -------------------------------------------------------
    // CREATE FORMDATA
    // -------------------------------------------------------

    const formData = new FormData();

    formData.append(
      "name",
      form.name.trim()
    );

    formData.append(
      "sku",
      form.sku.trim()
    );

    formData.append(
      "barcode",
      form.barcode.trim()
    );

    formData.append(
      "category",
      String(Number(form.category))
    );

    formData.append(
      "purchase_price",
      form.purchase_price
    );

    formData.append(
      "selling_price",
      form.selling_price
    );

    formData.append(
      "minimum_selling_price",
      form.minimum_selling_price === ""
        ? ""
        : form.minimum_selling_price
    );

    formData.append(
      "description",
      form.description.trim()
    );


    // -------------------------------------------------------
    // ACTUAL IMAGE FILE
    // -------------------------------------------------------

    if (selectedImage) {
      formData.append(
        "image",
        selectedImage
      );
    }


    try {
      setSaving(true);


      // -----------------------------------------------------
      // EDIT PRODUCT
      // -----------------------------------------------------

      if (editingProduct) {
        await axios.patch(
          `${API_BASE_URL}/products/${editingProduct.id}/`,
          formData,
          {
            headers: {
              ...authHeaders,
            },
          }
        );

        setSuccess(
          "Product updated successfully."
        );

      }

      // -----------------------------------------------------
      // ADD PRODUCT
      // -----------------------------------------------------

      else {
        await axios.post(
          `${API_BASE_URL}/products/`,
          formData,
          {
            headers: {
              ...authHeaders,
            },
          }
        );

        setSuccess(
          "Product added successfully."
        );
      }


      await loadData(true);

      setShowModal(false);
      setEditingProduct(null);
      setForm(EMPTY_FORM);

      setSelectedImage(null);
      setImagePreview("");
      setImageError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (err) {
      console.error(
        "Save product error:",
        err
      );

      const responseData =
        err.response?.data;

      if (
        responseData &&
        typeof responseData === "object"
      ) {
        const firstError =
          Object.values(responseData)
            .flat()
            .find(Boolean);

        setError(
          firstError ||
            responseData.detail ||
            responseData.message ||
            "Unable to save product."
        );
      } else {
        setError(
          "Unable to save product."
        );
      }

    } finally {
      setSaving(false);
    }
  };


  // =========================================================
  // ACTIVATE / DEACTIVATE PRODUCT
  // =========================================================

  const toggleProduct = async (product) => {
    const action = product.active
      ? "deactivate"
      : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setTogglingId(product.id);
      setError("");
      setSuccess("");

      await axios.patch(
        `${API_BASE_URL}/products/${product.id}/`,
        {
          active: !product.active,
        },
        {
          headers: {
            ...authHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );

      setSuccess(
        `Product ${action}d successfully.`
      );

      await loadData(true);

    } catch (err) {
      console.error(
        "Toggle product error:",
        err
      );

      setError(
        err.response?.data?.detail ||
          err.response?.data?.message ||
          `Unable to ${action} product.`
      );

    } finally {
      setTogglingId(null);
    }
  };


  // =========================================================
  // GO BACK
  // =========================================================

  const goBack = () => {
    window.location.href =
      "/admin-panel";
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">

        <div className="mx-auto flex min-h-20 max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          <div className="flex items-center gap-3">

            <button
              onClick={goBack}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft size={19} />
            </button>

            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Product Management
              </h1>

              <p className="text-xs text-slate-500">
                Manage ToyMall master products
              </p>
            </div>

          </div>


          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Plus size={17} />

            <span className="hidden sm:inline">
              Add Product
            </span>
          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="mx-auto max-w-[1500px] p-4 sm:p-6 lg:p-8">

        {/* ALERTS */}

        {error && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <p>{error}</p>

            <button
              onClick={() => setError("")}
              className="shrink-0"
            >
              <X size={17} />
            </button>

          </div>
        )}


        {success && (
          <div className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

            <p>{success}</p>

            <button
              onClick={() => setSuccess("")}
              className="shrink-0"
            >
              <X size={17} />
            </button>

          </div>
        )}


        {/* SUMMARY */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Products
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {products.length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Package size={21} />
              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Categories
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {categories.length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Package size={21} />
              </div>

            </div>

          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

            <div className="flex items-center justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Search Results
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {filteredProducts.length}
                </p>

              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Search size={21} />
              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            PRODUCT LIST
        ==================================================== */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* TOOLBAR */}

          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-900">
                Products
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Master product catalog used by all shops
              </p>

            </div>


            <div className="flex flex-col gap-3 sm:flex-row">

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search name, SKU or barcode..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100 sm:w-80"
                />

              </div>


              <button
                onClick={() =>
                  loadData(true)
                }
                disabled={refreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >

                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />

                Refresh

              </button>

            </div>

          </div>


          {/* LOADING */}

          {loading ? (

            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-center">

                <Loader2
                  size={30}
                  className="mx-auto animate-spin text-slate-700"
                />

                <p className="mt-3 text-sm text-slate-500">
                  Loading products...
                </p>

              </div>

            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Package size={25} />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-800">
                No products found
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Try another search or add a new product to your catalog.
              </p>

              <button
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
              >
                <Plus size={16} />
                Add Product
              </button>

            </div>

          ) : (

            <>

              {/* =================================================
                  DESKTOP TABLE
              ================================================== */}

              <div className="hidden overflow-x-auto lg:block">

                <table className="w-full min-w-[1100px]">

                  <thead>

                    <tr className="border-b border-slate-200 bg-slate-50">

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Product
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        SKU / Code
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Barcode
                      </th>

                      <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Category
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Purchase
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Selling
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Minimum
                      </th>

                      <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Action
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredProducts.map(
                      (product) => (

                        <tr
                          key={product.id}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                        >

                          <td className="px-5 py-4">

                            <div className="flex items-center gap-3">

                              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">

                                {product.image_url ? (

                                  <img
                                    src={
                                      product.image_url
                                    }
                                    alt={
                                      product.name
                                    }
                                    className="h-full w-full object-cover"
                                  />

                                ) : (

                                  <Package size={18} />

                                )}

                              </div>


                              <div>

                                <p className="text-sm font-semibold text-slate-800">
                                  {product.name}
                                </p>

                                {product.description && (
                                  <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-400">
                                    {
                                      product.description
                                    }
                                  </p>
                                )}

                              </div>

                            </div>

                          </td>


                          <td className="px-5 py-4">

                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {product.sku}
                            </span>

                          </td>


                          <td className="px-5 py-4">

                            <div className="flex items-center gap-2 text-sm text-slate-600">

                              <Barcode size={16} />

                              {product.barcode}

                            </div>

                          </td>


                          <td className="px-5 py-4">

                            <p className="text-sm text-slate-600">
                              {
                                product.category_name ||
                                "-"
                              }
                            </p>

                          </td>


                          <td className="px-5 py-4 text-right">

                            <p className="text-sm font-medium text-slate-700">
                              {formatCurrency(
                                product.purchase_price
                              )}
                            </p>

                          </td>


                          <td className="px-5 py-4 text-right">

                            <p className="text-sm font-bold text-slate-900">
                              {formatCurrency(
                                product.selling_price
                              )}
                            </p>

                          </td>


                          <td className="px-5 py-4 text-right">

                            <p className="text-sm font-medium text-slate-600">
                              {formatCurrency(
                                product.minimum_selling_price
                              )}
                            </p>

                          </td>


                          <td className="px-5 py-4 text-center">

                            {product.active ? (

                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                                Active
                              </span>

                            ) : (

                              <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                                Inactive
                              </span>

                            )}

                          </td>


                          <td className="px-5 py-4">

                            <div className="flex justify-end gap-2">

                              <button
                                onClick={() =>
                                  openEditModal(
                                    product
                                  )
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                title="Edit product"
                              >
                                <Edit3 size={16} />
                              </button>


                              <button
                                onClick={() =>
                                  toggleProduct(
                                    product
                                  )
                                }
                                disabled={
                                  togglingId ===
                                  product.id
                                }
                                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${
                                  product.active
                                    ? "border-red-100 text-red-600 hover:bg-red-50"
                                    : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                }`}
                                title={
                                  product.active
                                    ? "Deactivate"
                                    : "Activate"
                                }
                              >

                                {togglingId ===
                                product.id ? (

                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />

                                ) : product.active ? (

                                  <ToggleRight
                                    size={18}
                                  />

                                ) : (

                                  <ToggleLeft
                                    size={18}
                                  />

                                )}

                              </button>

                            </div>

                          </td>

                        </tr>

                      )
                    )}

                  </tbody>

                </table>

              </div>


              {/* =================================================
                  MOBILE / TABLET
              ================================================== */}

              <div className="grid gap-4 p-4 lg:hidden">

                {filteredProducts.map(
                  (product) => (

                    <div
                      key={product.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-500">

                            {product.image_url ? (

                              <img
                                src={
                                  product.image_url
                                }
                                alt={
                                  product.name
                                }
                                className="h-full w-full object-cover"
                              />

                            ) : (

                              <Package size={19} />

                            )}

                          </div>


                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-slate-900">
                              {product.name}
                            </p>

                            <p className="mt-0.5 text-xs text-slate-500">
                              SKU: {product.sku}
                            </p>

                          </div>

                        </div>


                        {product.active ? (

                          <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                            Active
                          </span>

                        ) : (

                          <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
                            Inactive
                          </span>

                        )}

                      </div>


                      <div className="mt-4 grid grid-cols-2 gap-3">

                        <div className="rounded-lg bg-slate-50 p-3">

                          <p className="text-[11px] text-slate-400">
                            Category
                          </p>

                          <p className="mt-1 text-xs font-semibold text-slate-700">
                            {
                              product.category_name ||
                              "-"
                            }
                          </p>

                        </div>


                        <div className="rounded-lg bg-slate-50 p-3">

                          <p className="text-[11px] text-slate-400">
                            Barcode
                          </p>

                          <p className="mt-1 truncate text-xs font-semibold text-slate-700">
                            {product.barcode}
                          </p>

                        </div>


                        <div className="rounded-lg bg-slate-50 p-3">

                          <p className="text-[11px] text-slate-400">
                            Selling Price
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(
                              product.selling_price
                            )}
                          </p>

                        </div>


                        <div className="rounded-lg bg-slate-50 p-3">

                          <p className="text-[11px] text-slate-400">
                            Minimum Price
                          </p>

                          <p className="mt-1 text-sm font-bold text-slate-900">
                            {formatCurrency(
                              product.minimum_selling_price
                            )}
                          </p>

                        </div>

                      </div>


                      <div className="mt-4 flex gap-2">

                        <button
                          onClick={() =>
                            openEditModal(
                              product
                            )
                          }
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Edit3 size={16} />
                          Edit
                        </button>


                        <button
                          onClick={() =>
                            toggleProduct(
                              product
                            )
                          }
                          disabled={
                            togglingId ===
                            product.id
                          }
                          className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold ${
                            product.active
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                          }`}
                        >

                          {togglingId ===
                          product.id ? (

                            <Loader2
                              size={16}
                              className="animate-spin"
                            />

                          ) : product.active ? (

                            <ToggleRight
                              size={17}
                            />

                          ) : (

                            <ToggleLeft
                              size={17}
                            />

                          )}

                          {product.active
                            ? "Deactivate"
                            : "Activate"}

                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            </>

          )}

        </section>

      </main>


      {/* =====================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">

              <div>

                <h2 className="text-lg font-bold text-slate-900">

                  {editingProduct
                    ? "Edit Product"
                    : "Add New Product"}

                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Product master information
                </p>

              </div>


              <button
                onClick={closeModal}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={19} />
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="max-h-[calc(92vh-145px)] overflow-y-auto p-5 sm:p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                {/* NAME */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Product Name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Racing Car"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                </div>


                {/* SKU */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Product Code / SKU *
                  </label>

                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="e.g. RC002"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm uppercase outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Salesman can search using this code.
                  </p>

                </div>


                {/* BARCODE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Barcode *
                  </label>

                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="e.g. 8901234567891"
                    className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                </div>


                {/* CATEGORY */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Category *
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  >

                    <option value="">
                      Select category
                    </option>

                    {categories.map(
                      (category) => (

                        <option
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* PURCHASE */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Purchase Price *
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="purchase_price"
                      value={
                        form.purchase_price
                      }
                      onChange={handleChange}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-slate-200 pl-8 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>

                </div>


                {/* SELLING */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Selling Price *
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="selling_price"
                      value={
                        form.selling_price
                      }
                      onChange={handleChange}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-slate-200 pl-8 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>

                </div>


                {/* MINIMUM */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Minimum Selling Price
                  </label>

                  <div className="relative">

                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      ₹
                    </span>

                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      name="minimum_selling_price"
                      value={
                        form.minimum_selling_price
                      }
                      onChange={handleChange}
                      placeholder="Optional"
                      className="h-11 w-full rounded-xl border border-slate-200 pl-8 pr-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />

                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Lowest price allowed during bargaining.
                  </p>

                </div>


                {/* =================================================
                    IMAGE UPLOAD
                ================================================== */}

                <div>

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Product Image
                  </label>


                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />


                  <div className="flex gap-3">

                    {/* IMAGE PREVIEW */}

                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">

                      {imagePreview ? (

                        <img
                          src={imagePreview}
                          alt="Product preview"
                          className="h-full w-full object-cover"
                        />

                      ) : (

                        <ImagePlus
                          size={25}
                          className="text-slate-400"
                        />

                      )}

                    </div>


                    {/* UPLOAD CONTROLS */}

                    <div className="min-w-0 flex-1">

                      <button
                        type="button"
                        onClick={() =>
                          fileInputRef.current?.click()
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <ImagePlus size={16} />

                        {selectedImage
                          ? "Change Image"
                          : "Choose Image"}
                      </button>


                      <p className="mt-2 text-[11px] leading-5 text-slate-400">
                        JPG, JPEG, PNG or WEBP.
                        Maximum size 5 MB.
                      </p>


                      {selectedImage && (

                        <div className="mt-2 flex items-center gap-2">

                          <p className="max-w-[220px] truncate text-xs font-medium text-slate-600">
                            {selectedImage.name}
                          </p>

                          <button
                            type="button"
                            onClick={
                              removeSelectedImage
                            }
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Remove selected image"
                          >
                            <X size={14} />
                          </button>

                        </div>

                      )}


                      {imageError && (

                        <p className="mt-2 text-xs font-medium text-red-600">
                          {imageError}
                        </p>

                      )}

                    </div>

                  </div>

                </div>


                {/* DESCRIPTION */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    name="description"
                    value={
                      form.description
                    }
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter product description..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>


              {/* MODAL ACTIONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving && (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingProduct
                    ? "Update Product"
                    : "Add Product"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}