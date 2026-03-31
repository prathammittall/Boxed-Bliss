"use client";

import Image from "next/image";
import LoadingLink from "@/components/routeLoading/LoadingLink";

type MarqueeItem = {
  title: string;
  subtitle: string;
  href: string;
  imageSrc: string;
};

export default function HomeMovingCarousel({ items }: { items: MarqueeItem[] }) {
  const loopItems = [...items, ...items];

  return (
    <section className="mt-16 overflow-hidden">
      <div className="marquee-right-track">
        {loopItems.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            className="soft-panel w-[280px] shrink-0 overflow-hidden sm:w-[320px] md:w-[360px]"
          >
            <div className="relative min-h-[200px]">
              <Image
                src={item.imageSrc}
                alt={item.title}
                fill
                className="object-cover"
                sizes="360px"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/5 via-transparent to-rose-paper/40" />
            </div>
            <div className="p-4">
              <p className="kicker">Featured</p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">{item.title}</h3>
              <p className="mt-2 text-sm text-rose-muted">{item.subtitle}</p>
              <LoadingLink href={item.href} className="btn-primary mt-4">
                Explore
              </LoadingLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

