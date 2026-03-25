import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { api } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

function PrimaryHero({
  title,
  subtitle,
  imageSrc,
}: {
  title: string;
  subtitle: string;
  imageSrc: string;
}) {
  return (
    <section className="mt-6">
      <div className="soft-panel overflow-hidden p-4 sm:p-6">
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="max-w-[46ch]">
            <p className="kicker">Explore</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-rose-muted">{subtitle}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <LoadingLink href="/shop" className="btn-primary">
                Shop now
              </LoadingLink>
              <LoadingLink href="/contact" className="btn-ghost">
                Custom orders
              </LoadingLink>
            </div>
          </div>

          <div className="relative min-h-[320px] overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft">
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/5 via-transparent to-rose-paper/35" />
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedCategory =
    typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined;

  const [productsResult, categoriesResult] = await Promise.allSettled([
    api.getProducts({ inStock: true, limit: 60, category: selectedCategory }),
    api.getCategoriesFlat(),
  ]);

  const products = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const heroImage = products[0]?.images?.[0] || FALLBACK_IMAGE;

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <PrimaryHero
          title="Handcrafted Shop"
          subtitle="A curated selection of gifts, hampers, and charming creations crafted for warmth, beauty, and celebration."
          imageSrc={heroImage}
        />

        <section className="mt-12">
          <SectionTitle title="Browse by Category" subtitle="Filter your gifting ideas in one tap." />
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <LoadingLink
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.id)}`}
                className={selectedCategory === category.id ? "btn-primary" : "btn-ghost"}
              >
                {category.name}
              </LoadingLink>
            ))}
            {categories.length === 0 ? (
              <p className="text-sm text-rose-muted">Categories are currently unavailable.</p>
            ) : null}
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle title="Collections" subtitle="Live products from your backend catalog." />
          <div className="grid gap-5 md:grid-cols-3">
            {products.map((product, idx) => (
              <article
                key={product.id}
                className="soft-panel overflow-hidden reveal"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="relative min-h-[230px]">
                  <Image
                    src={product.images?.[0] || FALLBACK_IMAGE}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[1.65rem] leading-tight text-rose-ink">{product.name}</h3>
                  <p className="mt-1 text-sm text-rose-muted">
                    {product.description || "Beautifully handcrafted and ready to gift."}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-rose-ink">Rs. {product.price.toFixed(2)}</p>
                    <LoadingLink href={`/shop/${encodeURIComponent(product.slug)}`} className="btn-ghost">
                      View details
                    </LoadingLink>
                  </div>
                </div>
              </article>
            ))}
            {products.length === 0 ? (
              <article className="soft-panel p-5 text-sm text-rose-muted md:col-span-3">
                No products are available right now.
              </article>
            ) : null}
          </div>
        </section>

        {productsResult.status === "rejected" || categoriesResult.status === "rejected" ? (
          <section className="mt-10">
            <article className="soft-panel p-5 text-sm text-rose-muted">
              Some shop data could not be loaded. Please verify the API server and try again.
            </article>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}