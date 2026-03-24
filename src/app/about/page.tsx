import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import LoadingLink from "@/components/routeLoading/LoadingLink";

export default async function AboutPage() {
  const storyImage = "/brand/logo-bg.png";
  const sideImage = "/brand/logo-bg.png";

  const values = [
    {
      title: "Intentional Craft",
      desc: "Every detail is designed to feel premium, warm, and personal.",
    },
    {
      title: "Soft + Modern",
      desc: "A refined visual language inspired by contemporary boutique brands.",
    },
    {
      title: "Made to Gift",
      desc: "Curations that turn moments into keepsakes you’ll want to keep.",
    },
  ];

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-6">
          <div className="soft-panel overflow-hidden p-4 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-center">
              <div>
                <p className="kicker">About</p>
                <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
                  Crafted with heart. Styled with taste.
                </h1>
                <p className="mt-4 text-sm leading-7 text-rose-muted max-w-[62ch]">
                  The Boxed Bliss is built for gifting moments—when you want beauty, care,
                  and a premium unboxing experience. We focus on cohesive tones, intentional
                  textures, and elegant presentation.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {values.map((v) => (
                    <div key={v.title} className="rounded-2xl border border-rose-line/80 bg-white/65 p-4">
                      <h3 className="font-display text-2xl leading-tight text-rose-ink">{v.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-rose-muted">{v.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-3">
                  <LoadingLink href="/collections" className="btn-primary">
                    Explore collections
                  </LoadingLink>
                  <LoadingLink href="/contact" className="btn-ghost">
                    Custom requests
                  </LoadingLink>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft min-h-[320px]">
                <Image
                  src={storyImage}
                  alt="Handcrafted story"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/10 via-transparent to-rose-paper/35" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle title="Our promise" subtitle="A calm, modern experience—designed for gifting." />
          <div className="grid gap-5 md:grid-cols-3">
            <article className="soft-panel overflow-hidden p-0">
              <div className="relative min-h-[240px]">
                <Image src={sideImage} alt="Premium materials" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/5 via-transparent to-rose-paper/35" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-2xl leading-tight text-rose-ink">
                  Premium presentation
                </h3>
                <p className="mt-2 text-sm leading-6 text-rose-muted">
                  Clean typography, cohesive palettes, and soft surfaces.
                </p>
              </div>
            </article>

            <article className="soft-panel p-5">
              <p className="kicker">Approach</p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">
                Edit for elegance
              </h3>
              <p className="mt-3 text-sm leading-7 text-rose-muted">
                We design each section to feel like a modern brand homepage: generous
                spacing, refined hierarchy, and visual rhythm.
              </p>
            </article>

            <article className="soft-panel p-5">
              <p className="kicker">Quality</p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">
                Thoughtful details
              </h3>
              <p className="mt-3 text-sm leading-7 text-rose-muted">
                Subtle textures and careful composition so your gift looks as good as it
                feels.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

