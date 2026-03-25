import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import HomeMovingCarousel from "@/components/HomeMovingCarousel";
import Image from "next/image";
import { api, type Product } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

function getEntityImage(entity?: { images?: string[]; image?: string | null }): string {
  if (entity?.images?.length && entity.images[0]) return entity.images[0];
  if (entity?.image) return entity.image;
  return FALLBACK_IMAGE;
}

function hasKeyword(product: Product, keyword: string): boolean {
  const source = `${product.name} ${product.category?.name ?? ""}`.toLowerCase();
  return source.includes(keyword.toLowerCase());
}

function SectionTitle({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-7 ${centered ? "text-center" : ""}`}>
      <div className="section-divider mb-7" aria-hidden="true" />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl leading-tight text-rose-ink sm:text-5xl">{title}</h2>
          {subtitle ? <p className="mt-2 text-sm text-rose-muted">{subtitle}</p> : null}
        </div>
        <LoadingLink href="/collections" className="btn-ghost hidden sm:inline-flex">
          View all
        </LoadingLink>
      </div>
    </div>
  );
}

export default async function Home() {
  const heroImage = "/brand/herosection.png";
  const [productsResult, categoriesResult] = await Promise.allSettled([
    api.getProducts({ featured: true, inStock: true, limit: 18 }),
    api.getCategoriesFlat(),
  ]);

  const featuredProducts = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  const pipeCleanerMatches = featuredProducts.filter(
    (product) => hasKeyword(product, "pipe") || hasKeyword(product, "cleaner")
  );
  const pipeCleanerCards = (pipeCleanerMatches.length ? pipeCleanerMatches : featuredProducts).slice(0, 3);

  const selectedPipeCleanerIds = new Set(pipeCleanerCards.map((item) => item.id));
  const hamperPool = featuredProducts.filter((item) => !selectedPipeCleanerIds.has(item.id));
  const hamperMatches = hamperPool.filter(
    (product) => hasKeyword(product, "hamper") || hasKeyword(product, "gift")
  );
  const hamperCards = (hamperMatches.length ? hamperMatches : hamperPool).slice(0, 3);

  const shopByPurpose = categories.slice(0, 4);
  const movingCarouselItems = featuredProducts.slice(0, 6).map((product) => ({
    title: product.name,
    subtitle: product.description || "Crafted to elevate heartfelt gifting moments.",
    href: `/shop/${encodeURIComponent(product.slug)}`,
    imageSrc: getEntityImage(product),
  }));

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />

      <main className="site-shell min-h-[100svh] w-full pb-16 pt-20 sm:pt-20">
        <section className="grid min-h-[calc(100svh-6rem)] items-center gap-9 lg:grid-cols-[1fr_0.96fr]">
          <div className="max-w-[560px]">
            <p className="kicker">Handmade with love and detail</p>
            <h1 className="mt-5 max-w-[18ch] font-display text-5xl leading-[0.96] text-rose-ink sm:text-7xl">
              Handcrafted Joy,
            </h1>
            <p className="font-script mt-2 text-7xl leading-none text-rose-accent sm:text-8xl lg:text-[6.7rem]">
              <span>Boxed with </span>
              <span className="hero-bliss-word">Bliss</span>
            </p>
            <p className="mt-6 max-w-[49ch] text-[0.95rem] leading-7 text-rose-muted">
              Discover a world of intentional gifting where every detail is crafted to wrap your
              moments in warmth, beauty, and celebration.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LoadingLink href="/collections" className="btn-primary">
                Explore Collections
              </LoadingLink>
            </div>
          </div>

          <div className="relative">
            <article className="soft-panel p-4 sm:p-5">
              <div className="relative overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft">
                <div className="relative min-h-[380px] sm:min-h-[520px]">
                  <Image
                    src={heroImage}
                    alt="The Boxed Bliss hero"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 45vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/10 via-transparent to-rose-paper/14" />
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="mt-20">
          <SectionTitle title="Pipe Cleaner Creations" />
          <div className="grid gap-5 md:grid-cols-3">
            {pipeCleanerCards.map((card) => (
              <article key={card.id} className="soft-panel overflow-hidden">
                <div className="photo-panel relative min-h-[330px] sm:min-h-[360px]">
                  <Image
                    src={getEntityImage(card)}
                    alt={card.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[1.95rem] leading-tight text-rose-ink">{card.name}</h3>
                  <p className="mt-1 text-sm text-rose-muted">
                    {card.description || "Thoughtful details, handcrafted with care."}
                  </p>
                </div>
              </article>
            ))}
            {pipeCleanerCards.length === 0 ? (
              <article className="soft-panel p-5 text-sm text-rose-muted md:col-span-3">
                Featured products are not available right now. Please try again shortly.
              </article>
            ) : null}
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <SectionTitle
            title="Occasion Hampers"
            subtitle="From festivities to forever vows, we turn your emotions into elegant hampers."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {hamperCards.map((card) => (
              <article key={card.id} className="soft-panel overflow-hidden">
                <div className="photo-panel relative min-h-[220px]">
                  <Image
                    src={getEntityImage(card)}
                    alt={card.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[1.7rem] leading-tight text-rose-ink">{card.name}</h3>
                  <p className="mt-1 text-sm text-rose-muted">
                    {card.description || "Premium gift styling for your celebration."}
                  </p>
                </div>
              </article>
            ))}
            {hamperCards.length === 0 ? (
              <article className="soft-panel p-5 text-sm text-rose-muted md:col-span-3">
                No hamper products are available yet.
              </article>
            ) : null}
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <SectionTitle title="Shop By Purpose" subtitle="Fast modules for quick intent-driven browsing." />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {shopByPurpose.map((item) => (
              <article key={item.id} className="soft-panel overflow-hidden p-0">
                <div className="relative min-h-[190px]">
                  <Image
                    src={getEntityImage(item)}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-2xl text-rose-ink">{item.name}</h3>
                  <LoadingLink href={`/shop?category=${encodeURIComponent(item.id)}`} className="btn-ghost mt-3">
                    View picks
                  </LoadingLink>
                </div>
              </article>
            ))}
            {shopByPurpose.length === 0 ? (
              <article className="soft-panel p-5 text-sm text-rose-muted sm:col-span-2 lg:col-span-4">
                Categories are unavailable at the moment.
              </article>
            ) : null}
          </div>
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="mb-7 text-center">
            <h2 className="font-display text-5xl leading-tight text-rose-ink">More to Explore</h2>
            <p className="mt-2 text-sm text-rose-muted">Quick highlights curated for effortless browsing.</p>
          </div>
          {movingCarouselItems.length > 0 ? (
            <HomeMovingCarousel items={movingCarouselItems} />
          ) : (
            <article className="soft-panel p-5 text-sm text-rose-muted">
              Products are unavailable right now. Please check back shortly.
            </article>
          )}
        </section>

        <section className="mt-16 sm:mt-20">
          <div className="soft-panel grid gap-6 p-6 sm:grid-cols-[1.07fr_0.93fr] sm:p-9">
            <div>
              <p className="kicker">Bespoke</p>
              <h2 className="mt-4 max-w-[18ch] font-display text-5xl leading-[0.95] text-rose-ink">
                Your Signature Phone Case
              </h2>
              <p className="mt-5 max-w-[44ch] text-sm leading-7 text-rose-muted">
                Transform your treasured memories into a custom case. We blend your visuals with
                elegant textures and hand-finished details for a one-of-one keepsake.
              </p>
              <LoadingLink href="/contact" className="btn-ghost mt-6">
                Design yours now
              </LoadingLink>
            </div>
            <div className="photo-panel relative min-h-[280px]">
              <Image
                src={getEntityImage(featuredProducts[0])}
                alt="Phone case design"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 38vw"
              />
            </div>
          </div>
        </section>

        <section className="mt-20">
          <div className="mb-7 text-center">
            <h2 className="font-display text-5xl leading-tight text-rose-ink">Floral Narratives</h2>
            <p className="font-script text-4xl leading-none text-rose-accent">Freshly crafted bloom stories</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr]">
            <article className="soft-panel overflow-hidden">
              <div className="photo-panel relative min-h-[420px]">
                <Image
                  src={getEntityImage(featuredProducts[1])}
                  alt="Everlasting Real Blooms"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 52vw"
                />
              </div>
              <div className="p-5">
                <h3 className="inline-block rounded-lg bg-white/72 px-3 py-1.5 font-display text-3xl text-rose-ink sm:text-[2.1rem]">
                  Everlasting Real Blooms
                </h3>
              </div>
            </article>

            <div className="grid gap-5 sm:grid-cols-2 sm:grid-rows-[1fr_auto] lg:grid-cols-2 lg:grid-rows-[1fr_auto]">
              <article className="soft-panel overflow-hidden sm:col-span-2">
                <div className="photo-panel relative min-h-[230px]">
                  <Image
                    src={getEntityImage(featuredProducts[2])}
                    alt="Floral keepsake"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </article>
              <article className="soft-panel overflow-hidden">
                <div className="photo-panel relative min-h-[180px]">
                  <Image
                    src={getEntityImage(featuredProducts[3])}
                    alt="Preserve memories"
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 36vw"
                  />
                </div>
              </article>
              <article className="soft-panel flex min-h-[180px] items-center p-6">
                <div>
                  <p className="kicker">Preserve</p>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">Memories</h3>
                  <p className="mt-2 text-sm text-rose-muted">
                    Signature floral moments that live beautifully beyond the event.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {productsResult.status === "rejected" || categoriesResult.status === "rejected" ? (
          <section className="mt-10">
            <article className="soft-panel p-5 text-sm text-rose-muted">
              Some live storefront sections may be unavailable until the backend connection is restored.
            </article>
          </section>
        ) : null}
      </main>

      <Footer />
    </div>
  );
}