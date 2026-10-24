import { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Delete,
  KeyRound,
  Loader2,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useShopAuth } from "../../context/ShopAuthContext";

const API_BASE_URL = "http://localhost:8000/api";

function ShopPin({ shop, onBack, onSuccess }) {
  const { login } = useShopAuth();

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handlePinChange = (value) => {
    if (!/^\d*$/.test(value)) {
      return;
    }

    if (value.length > 4) {
      return;
    }

    setPin(value);
    setError("");
  };

  const handleKeyPress = (value) => {
    if (pin.length >= 4 || loading) {
      return;
    }

    setPin((current) => current + value);
    setError("");
  };

  const handleDelete = () => {
    if (loading) {
      return;
    }

    setPin((current) => current.slice(0, -1));
    setError("");
  };

  const handleSubmit = async (event) => {
    event?.preventDefault();

    if (pin.length !== 4) {
      setError("Please enter your 4-digit shop PIN.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.post(
        `${API_BASE_URL}/shops/verify-pin/`,
        {
          shop_id: shop.id,
          pin,
        }
      );

      console.log("PIN verification response:", response.data);

      if (
        response.data?.success &&
        response.data?.token &&
        response.data?.shop
      ) {
        login(response.data.token, response.data.shop);

        onSuccess(response.data.shop);
        return;
      }

      throw new Error("Invalid authentication response.");
    } catch (err) {
      console.error("PIN verification error:", err);

      if (err.response) {
        const serverMessage =
          err.response.data?.message ||
          err.response.data?.detail ||
          "Invalid shop PIN.";

        setError(serverMessage);
      } else if (err.request) {
        setError(
          "Unable to connect to the ToyMall server. Please try again."
        );
      } else {
        setError("Something went wrong. Please try again.");
      }

      setPin("");
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (loading) {
      return;
    }

    setPin("");
    setError("");
    onBack();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-180px] h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="absolute bottom-[-180px] right-[-100px] h-[450px] w-[450px] rounded-full bg-purple-600/15 blur-3xl" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-8">

        <div className="w-full max-w-md">

          {/* Back */}
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="mb-8 flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Change Shop
          </button>

          {/* Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl shadow-black/20 backdrop-blur sm:p-9">

            {/* Icon */}
            <div className="mb-6 flex justify-center">

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
                <KeyRound className="h-8 w-8 text-blue-400" />
              </div>

            </div>

            {/* Heading */}
            <div className="text-center">

              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-400">
                Secure Access
              </p>

              <h1
                className="mt-3 text-2xl font-extrabold text-white"
                style={{
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                Enter Shop PIN
              </h1>

              {/* Shop */}
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2">

                <Store className="h-4 w-4 text-blue-400" />

                <span className="text-sm font-medium text-slate-300">
                  {shop.name}
                </span>

              </div>

            </div>

            {/* Hidden/Visible Input */}
            <form onSubmit={handleSubmit}>

              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(event) =>
                  handlePinChange(event.target.value)
                }
                className="sr-only"
                aria-label="Shop PIN"
              />

              {/* PIN Dots */}
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="mx-auto mt-8 flex w-full justify-center gap-4"
                aria-label="Enter PIN"
              >
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl border text-xl font-bold transition ${
                      index < pin.length
                        ? "border-blue-500 bg-blue-500/10 text-blue-400"
                        : "border-slate-700 bg-slate-950/70 text-slate-600"
                    }`}
                  >
                    {index < pin.length ? "•" : ""}
                  </span>
                ))}
              </button>

              {/* Error */}
              {error && (
                <div className="mt-5 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-center text-sm font-medium text-red-300">
                  {error}
                </div>
              )}

              {/* Number Pad */}
              <div className="mx-auto mt-7 grid max-w-xs grid-cols-3 gap-3">

                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(
                  (number) => (
                    <button
                      key={number}
                      type="button"
                      onClick={() =>
                        handleKeyPress(String(number))
                      }
                      disabled={loading || pin.length >= 4}
                      className="h-14 rounded-xl border border-slate-800 bg-slate-950/70 text-lg font-semibold text-slate-200 transition hover:border-blue-500/50 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {number}
                    </button>
                  )
                )}

                <div />

                <button
                  type="button"
                  onClick={() => handleKeyPress("0")}
                  disabled={loading || pin.length >= 4}
                  className="h-14 rounded-xl border border-slate-800 bg-slate-950/70 text-lg font-semibold text-slate-200 transition hover:border-blue-500/50 hover:bg-slate-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  0
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading || pin.length === 0}
                  className="flex h-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 text-slate-400 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Delete PIN digit"
                >
                  <Delete className="h-5 w-5" />
                </button>

              </div>

              {/* Verify */}
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="mt-7 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Verify PIN
                  </>
                )}
              </button>

            </form>

            {/* Security Note */}
            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">

              <ShieldCheck className="h-4 w-4" />

              <span>Protected by ToyMall secure authentication</span>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default ShopPin;