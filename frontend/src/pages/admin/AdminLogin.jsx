import { useState } from "react";
import axios from "axios";
import {
  ShieldCheck,
  LockKeyhole,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Store,
} from "lucide-react";

import { useAdminAuth } from "../../context/AdminAuthContext";

const API_BASE_URL = "https://toymall-inventory-pos.onrender.com/api";

function AdminLogin() {
  const { login } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername || !password) {
      setError("Please enter username and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_BASE_URL}/accounts/admin/login/`,
        {
          username: cleanUsername,
          password,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Login failed."
        );
      }

      login(
        response.data.token,
        response.data.admin
      );

      // Move to private admin panel.
      window.location.href = "/admin-panel";
    } catch (err) {
      console.error("Admin login error:", err);

      const message =
        err.response?.data?.message ||
        err.message ||
        "Unable to login. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />

        <div className="absolute bottom-[-180px] left-[-120px] h-[420px] w-[420px] rounded-full bg-cyan-600/10 blur-3xl" />

        <div className="absolute right-[-120px] top-1/3 h-[420px] w-[420px] rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      {/* Main */}
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">

        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="mb-8 text-center">

            <div className="mb-5 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl">
                <Store className="h-8 w-8 text-slate-950" />
              </div>
            </div>

            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
              ToyMall
            </p>

            <h1
              className="mt-2 text-3xl font-extrabold"
              style={{
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              Admin Panel
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Sign in to manage products, stock, sales and
              shop operations.
            </p>
          </div>

          {/* Security badge */}
          <div className="mb-5 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs font-medium text-slate-400 backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Secure Administrator Access
            </div>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>

              {/* Username */}
              <div className="mb-5">

                <label
                  htmlFor="admin-username"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Username
                </label>

                <div className="relative">

                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="admin-username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    placeholder="Enter admin username"
                    autoComplete="username"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                </div>
              </div>

              {/* Password */}
              <div className="mb-6">

                <label
                  htmlFor="admin-password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">

                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter admin password"
                    autoComplete="current-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 py-3.5 pl-12 pr-12 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-800 hover:text-slate-300 disabled:opacity-50"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>

                </div>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    Sign In to Admin Panel
                  </>
                )}
              </button>

            </form>

            {/* Security note */}
            <div className="mt-6 border-t border-slate-800 pt-5 text-center">
              <p className="text-xs leading-5 text-slate-600">
                Authorized administrators only.
                <br />
                Your session is securely protected.
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-600">
              ToyMall Management Portal
            </p>
          </div>

        </div>

      </main>
    </div>
  );
}

export default AdminLogin;