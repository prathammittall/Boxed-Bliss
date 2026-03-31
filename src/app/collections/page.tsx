import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import { api } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

function getCategoryImage(image?: string | null, featuredImage?: string): string {
  if (typeof image === "string" && image.trim().length > 0) {
    return image;
  }
  if (typeof featuredImage === "string" && featuredImage.trim().length > 0) {
    return featuredImage;
  }
  return FALLBACK_IMAGE;
}

function BigTile({
  title,
  subtitle,
  imageSrc,
  href,
}: {
  title: string;
  subtitle: string;
  imageSrc?: string;
  href: string;
}) {
  return (
    <article className="soft-panel overflow-hidden p-0">
      <div className="relative min-h-[280px] sm:min-h-[310px]">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 45vw"
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/5 via-transparent to-rose-paper/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-rose-soft to-rose-paper" />
        )}
      </div>

      <div className="border-t border-rose-line/70 bg-white/70 p-5 sm:p-6">
        <p className="kicker">Collection</p>
        <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink sm:text-[2rem]">{title}</h3>
        <p className="mt-3 max-w-[42ch] text-sm leading-6 text-rose-muted">{subtitle}</p>

        <div className="mt-5 flex flex-wrap gap-3">
          <LoadingLink href={href} className="btn-primary">
            View
          </LoadingLink>
          <LoadingLink href="/shop" className="btn-ghost">
            Explore
          </LoadingLink>
        </div>
      </div>
    </article>
  );
}

export default async function CollectionsPage() {
  const [categoriesResult, productsResult] = await Promise.allSettled([
    api.getCategories(),
    api.getProducts({ featured: true, limit: 3 }),
  ]);

  const categoriesTree = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
  const categories = categoriesTree.flatMap((category) => [category, ...(category.children ?? [])]);
  const featuredProducts = productsResult.status === "fulfilled" ? productsResult.value.data : [];

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <SectionTitle
          title="Collections"
          subtitle="Live categories curated from your backend catalog."
          centered={false}
        />

        <div className="grid gap-5 lg:grid-cols-3">
          {categories.slice(0, 6).map((category) => (
            <BigTile
              key={category.id}
              title={category.name}
              subtitle={category.description || "A premium handcrafted curation for meaningful gifting."}
              imageSrc={getCategoryImage(category.image, featuredProducts[0]?.images?.[0])}
              href={`/shop?category=${encodeURIComponent(category.id)}`}
            />
          ))}
          {categories.length === 0 ? (
            <article className="soft-panel p-5 text-sm text-rose-muted lg:col-span-3">
              Categories are not available right now.
            </article>
          ) : null}
        </div>

        <section className="mt-12">
          <div className="soft-panel p-6 sm:p-8">
            <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="kicker">Signature styling</p>
                <h2 className="mt-3 font-display text-4xl leading-tight text-rose-ink">
                  Designed like a premium brand.
                </h2>
                <p className="mt-4 max-w-[62ch] text-sm leading-7 text-rose-muted">
                  Soft materials, refined spacing, and an editorial layout so every collection
                  feels like it belongs on a modern luxury storefront.
                </p>
              </div>
              <div className="relative min-h-[260px] overflow-hidden rounded-[1rem] border border-rose-line/70 bg-white/60">
                <Image
                  src={featuredProducts[0]?.images?.[0] || FALLBACK_IMAGE}
                  alt={featuredProducts[0]?.name || "Featured collection"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 34vw"
                />
                <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(253,238,245,0.7),transparent_55%),radial-gradient(500px_circle_at_90%_30%,rgba(222,238,232,0.4),transparent_55%)]" />
                <div className="relative p-6">
                  <p className="kicker">Bespoke</p>
                  <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">Mix & match.</h3>
                  <p className="mt-3 text-sm leading-6 text-rose-muted">
                    Share a vibe and get a curated combination of pieces.
                  </p>
                  <LoadingLink href="/contact" className="btn-primary mt-5">
                    Start a request
                  </LoadingLink>
                </div>
              </div>
            </div>
          </div>
        </section>

        {categoriesResult.status === "rejected" || productsResult.status === "rejected" ? (
          <section className="mt-10">
            <article className="soft-panel p-5 text-sm text-rose-muted">
              Some collection sections are temporarily unavailable due to a backend connection issue.
            </article>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}