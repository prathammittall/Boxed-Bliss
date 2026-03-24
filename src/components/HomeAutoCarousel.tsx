"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LoadingLink from "@/components/routeLoading/LoadingLink";

type Slide = {
  title: string;
  caption: string;
  href: string;
  imageSrc: string;
};

export default function HomeAutoCarousel({ slides }: { slides: Slide[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 3200);
    return () => window.clearInterval(t);
  }, [slides.length]);

  return (
    <div className="soft-panel overflow-hidden p-4 sm:p-5">
      <div className="relative min-h-[280px] overflow-hidden rounded-xl">
        {slides.map((slide, index) => (
          <article
            key={slide.title}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === active ? "opacity-100" : "opacity-0"
            }`}
          >
            <Image
              src={slide.imageSrc}
              alt={slide.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-rose-paper/75 via-rose-paper/35 to-transparent" />
            <div className="absolute inset-y-0 left-0 flex max-w-[80%] items-center p-6 sm:p-8">
              <div>
                <p className="kicker">Featured</p>
                <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink sm:text-4xl">
                  {slide.title}
                </h3>
                <p className="mt-3 max-w-[44ch] text-sm leading-7 text-rose-muted">
                  {slide.caption}
                </p>
                <LoadingLink href={slide.href} className="btn-primary mt-5">
                  Shop this now
                </LoadingLink>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Go to ${slide.title}`}
            onClick={() => setActive(index)}
            className={`h-2.5 rounded-full transition-all ${
              index === active ? "w-7 bg-rose-accent" : "w-2.5 bg-rose-line"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

