"use client";

import Link from "next/link";

export default function FloatingContactButton() {
  return (
    <Link
      href="/contact"
      aria-label="Contact us"
      className="fixed bottom-5 right-5 z-[60] inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#d69bb7] text-white shadow-[0_12px_24px_rgba(183,118,147,0.28)] transition hover:translate-y-[-2px] hover:bg-[#c88fab]"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M4 5h16v10H8l-4 4V5Zm3 4h10M7 12h7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

