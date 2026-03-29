"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";

type AddToCartButtonProps = {
  item: {
    productId: string;
    slug: string;
    name: string;
    price: number;
    image?: string | null;
    variantInfo?: string | null;
  };
  className?: string;
};

export default function AddToCartButton({ item, className = "btn-primary" }: AddToCartButtonProps) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleAddToCart() {
    if (added) {
      router.push("/cart");
      return;
    }

    addToCart({ ...item, quantity: 1 });
    setAdded(true);

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setAdded(false), 3000);
  }

  return (
    <button type="button" className={className} onClick={handleAddToCart}>
      {added ? "View cart" : "Add to cart"}
    </button>
  );
}
