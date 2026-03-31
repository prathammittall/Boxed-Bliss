import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import AddToCartButton from "@/components/AddToCartButton";
import { api } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let product = null;
  let loadError = "";

  try {
    product = await api.getProduct(slug);
  } catch {
    loadError = "This product could not be loaded right now.";
  }

  const images = product?.images?.length ? product.images : [FALLBACK_IMAGE];

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />

      <main className="site-shell pb-16 pt-16 sm:pt-16">
        {!product ? (
          <section className="mt-8">
            <article className="soft-panel p-6 text-sm text-rose-muted">
              {loadError || "Product not found."}
            </article>
          </section>
        ) : (
          <section className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="soft-panel p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {images.slice(0, 4).map((image, index) => (
                  <div key={`${image}-${index}`} className="relative min-h-[220px] overflow-hidden rounded-xl border border-white/70 bg-rose-soft">
                    <Image
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 30vw"
                    />
                  </div>
                ))}
              </div>
            </article>

            <article className="soft-panel p-5 sm:p-8">
              <p className="kicker">Product</p>
              <h1 className="mt-2 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">{product.name}</h1>
              <p className="mt-3 text-sm leading-7 text-rose-muted">
                {product.description || "Beautifully handcrafted and ready for meaningful gifting."}
              </p>

              <div className="mt-5 flex flex-wrap items-end gap-2 sm:gap-3">
                <p className="font-display text-3xl text-rose-ink sm:text-4xl">Rs. {product.price.toFixed(2)}</p>
                {product.comparePrice ? (
                  <p className="text-sm text-rose-muted line-through">Rs. {product.comparePrice.toFixed(2)}</p>
                ) : null}
              </div>

              <div className="mt-6 grid gap-2 text-sm text-rose-muted">
                <p>Status: {product.inStock ? "In stock" : "Out of stock"}</p>
                {product.category ? <p>Category: {product.category.name}</p> : null}
              </div>

              {product.variants?.length ? (
                <div className="mt-6 rounded-xl border border-rose-line/80 bg-white/60 p-4">
                  <p className="kicker">Variants</p>
                  <ul className="mt-2 grid gap-1 text-sm text-rose-muted">
                    {product.variants.map((variant) => (
                      <li key={variant.id}>
                        {variant.label}: {variant.value}
                        {variant.price ? ` (+Rs. ${variant.price.toFixed(2)})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                <LoadingLink href={`/checkout?product=${encodeURIComponent(product.slug)}`} className="btn-primary">
                  Buy now
                </LoadingLink>
                <AddToCartButton
                  item={{
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.images?.[0] ?? null,
                  }}
                />
                <LoadingLink href="/shop" className="btn-ghost">
                  Back to shop
                </LoadingLink>
              </div>
            </article>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
