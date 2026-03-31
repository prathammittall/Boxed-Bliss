import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

export default async function ShippingReturnsPage() {
  const img = "/brand/logo-bg.png";

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-6">
          <div className="soft-panel overflow-hidden p-4 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-start">
              <div>
                <p className="kicker">Shipping & returns</p>
                <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
                  Smooth delivery, thoughtful policies
                </h1>
                <p className="mt-4 text-sm leading-7 text-rose-muted max-w-[68ch]">
                  This is a placeholder page. Replace with your official shipping and
                  returns policy details for production.
                </p>

                <div className="mt-6 grid gap-4">
                  {[
                    { t: "Shipping", d: "Dispatch timelines and tracking details go here." },
                    { t: "Returns", d: "Eligibility, timelines, and conditions go here." },
                    { t: "Support", d: "We’ll help you resolve any delivery-related issues." },
                  ].map((x) => (
                    <article
                      key={x.t}
                      className="rounded-2xl border border-rose-line/80 bg-white/65 p-5"
                    >
                      <h3 className="font-display text-2xl leading-tight text-rose-ink">
                        {x.t}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-rose-muted">{x.d}</p>
                    </article>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[320px] overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft">
                <Image
                  src={img}
                  alt="Shipping inspiration"
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
      </main>
      <Footer />
    </div>
  );
}

