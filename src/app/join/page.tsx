import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LoadingLink from "@/components/routeLoading/LoadingLink";

export default async function JoinPage() {
  const panel = "/brand/logo-bg.png";

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-6">
          <div className="soft-panel overflow-hidden p-4 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-center">
              <div>
                <p className="kicker">Join our bliss circle</p>
                <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
                  Get first access to new hampers
                </h1>
                <p className="mt-4 text-sm leading-7 text-rose-muted max-w-[62ch]">
                  A calm, curated newsletter. Expect premium gift inspirations, seasonal
                  themes, and early previews—never spam.
                </p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-rose-line/80 bg-white/65 p-4">
                    <p className="kicker">Frequency</p>
                    <p className="mt-2 text-rose-ink">2x a month</p>
                  </div>
                  <div className="rounded-2xl border border-rose-line/80 bg-white/65 p-4">
                    <p className="kicker">Style</p>
                    <p className="mt-2 text-rose-ink">Rose + soft mint</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <LoadingLink href="/contact" className="btn-primary">
                    Subscribe
                  </LoadingLink>
                  <LoadingLink href="/collections" className="btn-ghost">
                    Preview benefits
                  </LoadingLink>
                </div>
              </div>

              <div className="relative min-h-[320px] overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft">
                <Image
                  src={panel}
                  alt="Newsletter inspiration"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/10 via-transparent to-rose-paper/35" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="soft-panel p-6 sm:p-8">
            <p className="kicker">What you get</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {[
                { t: "Seasonal themes", d: "Elegant occasion planning ideas." },
                { t: "Curated picks", d: "Best-selling gift combos, refined." },
                { t: "Personal touches", d: "Small details that make gifts special." },
              ].map((x) => (
                <article
                  key={x.t}
                  className="rounded-2xl border border-rose-line/80 bg-white/65 p-4"
                >
                  <h3 className="font-display text-2xl leading-tight text-rose-ink">
                    {x.t}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-rose-muted">{x.d}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

