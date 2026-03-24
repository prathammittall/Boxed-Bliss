import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

export default async function PrivacyPolicyPage() {
  const img = "/brand/logo-bg.png";

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-6">
          <div className="soft-panel overflow-hidden p-4 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
              <div>
                <p className="kicker">Privacy policy</p>
                <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
                  Your privacy matters
                </h1>
                <p className="mt-4 text-sm leading-7 text-rose-muted max-w-[68ch]">
                  This is a placeholder policy page for the demo website. In production,
                  replace this text with your official privacy policy details.
                </p>

                <div className="mt-6 grid gap-4">
                  {[
                    { t: "What we collect", d: "Basic contact and order details you provide." },
                    { t: "How we use it", d: "To fulfill orders and personalize your gifting experience." },
                    { t: "How long we keep it", d: "Only as long as needed for service and compliance." },
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

              <div className="relative overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft min-h-[320px]">
                <Image
                  src={img}
                  alt="Privacy inspiration"
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

