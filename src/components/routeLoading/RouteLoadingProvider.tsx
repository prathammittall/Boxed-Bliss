"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type RouteLoadingContextValue = {
  isNavigating: boolean;
  startNavigation: () => void;
};

const RouteLoadingContext = createContext<RouteLoadingContextValue | null>(null);

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  const startNavigation = useCallback(() => {
    setIsNavigating(true);
  }, []);

  useEffect(() => {
    if (!isNavigating) return;
    const t = window.setTimeout(() => setIsNavigating(false), 280);
    return () => window.clearTimeout(t);
  }, [isNavigating]);

  useEffect(() => {
    const t = window.setTimeout(() => setIsNavigating(false), 0);
    return () => window.clearTimeout(t);
  }, [pathname]);

  const value = React.useMemo(
    () => ({
      isNavigating,
      startNavigation,
    }),
    [isNavigating, startNavigation],
  );

  return (
    <RouteLoadingContext.Provider value={value}>{children}</RouteLoadingContext.Provider>
  );
}

export function useRouteLoading() {
  const ctx = useContext(RouteLoadingContext);
  if (!ctx) throw new Error("useRouteLoading must be used within RouteLoadingProvider");
  return ctx;
}

