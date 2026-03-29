"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { CART_UPDATED_EVENT, getCartItems } from "@/lib/cart";

const links = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/collections" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const activeHref = useMemo(() => pathname ?? "/", [pathname]);

  useEffect(() => {
    function refreshCount() {
      const count = getCartItems().reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    }

    refreshCount();
    window.addEventListener(CART_UPDATED_EVENT, refreshCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, refreshCount);
    };
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-rose-line/80 bg-rose-paper/95 backdrop-blur-xl">
      <div className="site-shell grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3">
        <LoadingLink href="/" className="flex items-center gap-2" aria-label="Home">
          <Image
            src="/brand/logo-bg.png"
            alt="The Boxed Bliss logo"
            width={40}
            height={40}
            className="h-10 w-10 rounded-full border border-rose-line object-cover shadow-sm"
            priority
          />
          <span className="font-script text-[1.75rem] leading-none text-rose-ink sm:text-[2rem]">
            Boxed with Bliss
          </span>
        </LoadingLink>

        <nav className="hidden items-center justify-center gap-1 md:flex">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? activeHref === "/"
                : activeHref === link.href || activeHref.startsWith(`${link.href}/`);

            return (
              <LoadingLink
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-[0.68rem] uppercase tracking-[0.18em] transition ${
                  isActive
                    ? "bg-rose-accent/14 text-rose-ink"
                    : "text-rose-muted hover:bg-white/70 hover:text-rose-ink"
                }`}
              >
                {link.label}
              </LoadingLink>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            aria-label="Search"
            className="hidden h-8 w-8 items-center justify-center rounded-full border border-rose-line/85 bg-white/75 text-rose-muted transition hover:border-rose-accent/50 hover:text-rose-ink sm:inline-flex"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path
                d="M15.5 15.5L20 20M10.8 17a6.2 6.2 0 1 1 0-12.4 6.2 6.2 0 0 1 0 12.4Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <LoadingLink
            href="/collections"
            aria-label="Liked items"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-line/85 bg-white/75 text-rose-muted transition hover:border-rose-accent/50 hover:text-rose-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path
                d="M12 20s-6.8-4.1-8.8-8C1.7 9.4 2.9 6.3 5.8 5.7c2-.4 3.6.4 4.6 1.8 1-1.4 2.6-2.2 4.6-1.8 2.9.6 4.1 3.7 2.6 6.3C18.8 15.9 12 20 12 20Z"
                fill="currentColor"
              />
            </svg>
          </LoadingLink>

          <LoadingLink
            href="/cart"
            aria-label="Cart"
            className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-line/85 bg-white/75 text-rose-muted transition hover:border-rose-accent/50 hover:text-rose-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
              <path
                d="M6 8h12l-1.2 10.2a1.6 1.6 0 0 1-1.6 1.4H8.8a1.6 1.6 0 0 1-1.6-1.4L6 8Zm3-2.2a3 3 0 0 1 6 0V8H9V5.8Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {cartCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-ink px-1 text-[10px] font-medium leading-none text-rose-paper">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </LoadingLink>

          <button
            type="button"
            aria-label="Toggle menu"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-rose-line/85 bg-white/75 text-rose-muted md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="text-[0.58rem] uppercase tracking-[0.13em]">M</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="md:hidden border-t border-rose-line/70 bg-rose-paper/98">
          <div className="site-shell py-3">
            <nav className="grid gap-1">
              {links.map((link) => {
                const isActive =
                  link.href === "/"
                    ? activeHref === "/"
                    : activeHref === link.href || activeHref.startsWith(`${link.href}/`);

                return (
                  <LoadingLink
                    key={link.href}
                    href={link.href}
                    className={`rounded-lg px-3 py-2 text-xs uppercase tracking-[0.17em] ${
                      isActive
                        ? "bg-rose-accent/14 text-rose-ink"
                        : "text-rose-muted hover:bg-white/75 hover:text-rose-ink"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </LoadingLink>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

    </header>
  );
}
