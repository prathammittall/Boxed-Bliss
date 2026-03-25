"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { api } from "@/lib/api";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Contacts", href: "/admin/contacts" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState<string>("");

  const isLoginRoute = useMemo(() => pathname === "/admin/login", [pathname]);

  useEffect(() => {
    let active = true;

    async function checkAdminSession() {
      if (isLoginRoute) {
        setChecking(false);
        return;
      }

      try {
        const me = await api.adminMe();
        if (!active) return;
        setAdminEmail(me.email);
      } catch {
        if (!active) return;
        router.replace("/admin/login");
      } finally {
        if (active) setChecking(false);
      }
    }

    checkAdminSession();
    return () => {
      active = false;
    };
  }, [isLoginRoute, router]);

  async function handleLogout() {
    try {
      await api.adminLogout();
    } finally {
      router.replace("/admin/login");
    }
  }

  if (checking) {
    return (
      <div className="min-h-svh bg-rose-paper">
        <main className="site-shell py-20">
          <article className="soft-panel p-6 text-sm text-rose-muted">Checking admin session...</article>
        </main>
      </div>
    );
  }

  if (isLoginRoute) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-svh bg-rose-paper">
      <div className="site-shell grid gap-5 py-6 lg:grid-cols-[250px_1fr]">
        <aside className="soft-panel h-fit p-4">
          <div className="mb-4 border-b border-rose-line/80 pb-4">
            <p className="kicker">Admin</p>
            <h1 className="font-display text-3xl text-rose-ink">Boxed Bliss</h1>
            {adminEmail ? <p className="mt-2 text-xs text-rose-muted">Signed in as {adminEmail}</p> : null}
          </div>

          <nav className="grid gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <LoadingLink
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-xs uppercase tracking-[0.16em] ${
                    isActive
                      ? "bg-rose-accent/14 text-rose-ink"
                      : "text-rose-muted hover:bg-white/80 hover:text-rose-ink"
                  }`}
                >
                  {item.label}
                </LoadingLink>
              );
            })}
          </nav>

          <button type="button" className="btn-ghost mt-6 w-full" onClick={handleLogout}>
            Logout
          </button>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}
