"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.adminLogin(email, password);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to login. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-svh bg-rose-paper">
      <main className="site-shell grid min-h-svh place-items-center py-16">
        <section className="soft-panel w-full max-w-xl p-6 sm:p-8">
          <p className="kicker">Admin Access</p>
          <h1 className="mt-3 font-display text-4xl text-rose-ink">Sign in</h1>
          <p className="mt-2 text-sm text-rose-muted">Use admin credentials to manage the storefront.</p>

          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <label className="block text-sm">
              <span className="text-rose-muted">Email</span>
              <input
                type="email"
                name="email"
                required
                className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
              />
            </label>

            <label className="block text-sm">
              <span className="text-rose-muted">Password</span>
              <input
                type="password"
                name="password"
                required
                className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
              />
            </label>

            <div className="mt-2 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              {error ? <p className="text-sm text-rose-muted">{error}</p> : null}
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
