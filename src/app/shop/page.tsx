import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import LoadingLink from "@/components/routeLoading/LoadingLink";

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

          <div className="relative overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft">
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

export default async function ShopPage() {
  const heroImage = "/brand/logo-bg.png";
  const productImage = "/brand/logo-bg.png";

  const cards = [
    { title: "Artisan Bouquets", caption: "Handcrafted keepsake gifting.", img: productImage },
    { title: "Whimsical Clips", caption: "Soft-tone charm for playful moments.", img: productImage },
    { title: "Mini Bags", caption: "Statement accessories with a gentle touch.", img: productImage },
    { title: "Birthday Bloom", caption: "A personalized gift basket for celebrations.", img: productImage },
    { title: "Little Wonders", caption: "Occasion favorites, curated with care.", img: productImage },
    { title: "Forever Together", caption: "Elegant pairings for timeless occasions.", img: productImage },
  ];

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <PrimaryHero
          title="Handcrafted Shop"
          subtitle="A curated selection of gifts, hampers, and charming creations—crafted for warmth, beauty, and the moment you give."
          imageSrc={heroImage}
        />

        <section className="mt-12">
          <SectionTitle title="Collections" subtitle="Shop by mood, made to delight." />
          <div className="grid gap-5 md:grid-cols-3">
            {cards.map((card, idx) => (
              <article
                key={`${card.title}-${idx}`}
                className="soft-panel overflow-hidden reveal"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <div className="relative min-h-[230px]">
                  <Image
                    src={card.img}
                    alt={card.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-display text-[1.65rem] leading-tight text-rose-ink">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm text-rose-muted">{card.caption}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

