import React, { useEffect, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, user, loading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.email.trim() || !form.password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);

    const result = await login({
      email: form.email.trim(),
      password: form.password,
    });

    setSubmitting(false);

    if (!result.success) {
      setError(result.message);
      return;
    }

    const redirectPath = location.state?.from || "/dashboard";

    navigate(redirectPath, {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-6xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-2">
          {/* LEFT */}
          <div className="hidden bg-slate-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-slate-900">
                FS
              </div>

              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                Force Strike
              </p>

              <h1 className="max-w-md text-4xl font-bold leading-tight">
                Martial Arts Academy Management System
              </h1>

              <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
                Manage students, attendance, progress, memberships,
                payments, renewals, queries and academy operations
                from one secure platform.
              </p>
            </div>

            <p className="text-xs text-slate-500">
              FORCE STRIKE MARTIAL ARTS ACADEMY
            </p>
          </div>

          {/* RIGHT */}
          <div className="p-8 sm:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <p className="text-sm font-semibold text-slate-500">
                  Welcome back
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-950">
                  Sign in
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Access your Force Strike account.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-11 pr-12 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;