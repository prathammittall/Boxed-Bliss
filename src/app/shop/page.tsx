import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import LoadingLink from "@/components/routeLoading/LoadingLink";
import AddToCartButton from "@/components/AddToCartButton";
import { api } from "@/lib/api";

const FALLBACK_IMAGE = "/brand/logo-bg.png";

export default async function ShopPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedCategory =
    typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : undefined;

  const [productsResult, categoriesResult] = await Promise.allSettled([
    api.getProducts({ inStock: true, visibleOnFrontend: true, limit: 60, category: selectedCategory }),
    api.getCategoriesFlat(),
  ]);

  const products = productsResult.status === "fulfilled" ? productsResult.value.data : [];
  const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">

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
                  <h3 className="font-display text-2xl leading-tight text-rose-ink sm:text-[1.65rem]">{product.name}</h3>
                  <p className="mt-1 text-sm text-rose-muted">
                    {product.description || "Beautifully handcrafted and ready to gift."}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-rose-ink">Rs. {product.price.toFixed(2)}</p>
                    <LoadingLink href={`/shop/${encodeURIComponent(product.slug)}`} className="btn-ghost">
                      View details
                    </LoadingLink>
                  </div>
                  <div className="mt-3">
                    <AddToCartButton
                      item={{
                        productId: product.id,
                        slug: product.slug,
                        name: product.name,
                        price: product.price,
                        image: product.images?.[0] ?? null,
                      }}
                    />
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