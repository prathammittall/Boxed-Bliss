import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import Image from "next/image";

export default async function ContactPage() {
  const contactImage = "/brand/logo-bg.png";

  return (
    <div className="overflow-x-hidden bg-rose-paper">
      <Navbar />
      <main className="site-shell pb-16 pt-16 sm:pt-16">
        <section className="mt-6">
          <div className="soft-panel overflow-hidden p-4 sm:p-6">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] items-center">
              <div>
                <p className="kicker">Contact</p>
                <h1 className="mt-3 font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
                  Let’s design something beautiful
                </h1>
                <p className="mt-4 text-sm leading-7 text-rose-muted max-w-[58ch]">
                  Tell us the occasion, the vibe, and any details you want included. We’ll
                  help you craft a premium, curated gift experience.
                </p>

                <div className="mt-6 grid gap-4">
                  <div className="rounded-2xl border border-rose-line/80 bg-white/65 p-4">
                    <p className="kicker">Hours</p>
                    <p className="mt-2 text-rose-ink">Mon - Sat • 10am - 7pm</p>
                  </div>
                  <div className="rounded-2xl border border-rose-line/80 bg-white/65 p-4">
                    <p className="kicker">Response</p>
                    <p className="mt-2 text-rose-ink">Typically within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[1rem] border border-white/70 bg-rose-soft min-h-[320px]">
                <Image
                  src={contactImage}
                  alt="Contact inspiration"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-rose-paper/5 via-transparent to-rose-paper/40" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle title="Send a request" subtitle="Custom orders, collaborations, and questions." />
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <form className="soft-panel p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="text-rose-muted">Your name</span>
                    <input
                      type="text"
                      name="name"
                      required
                      className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-rose-muted">Email</span>
                    <input
                      type="email"
                      name="email"
                      required
                      className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
                    />
                  </label>
                </div>

                <label className="block mt-4 text-sm">
                  <span className="text-rose-muted">Occasion</span>
                  <input
                    type="text"
                    name="occasion"
                    className="mt-2 w-full rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
                  />
                </label>

                <label className="block mt-4 text-sm">
                  <span className="text-rose-muted">Message</span>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    className="mt-2 w-full resize-none rounded-xl border border-rose-line/80 bg-white/70 px-4 py-3 text-sm outline-none focus:border-rose-accent"
                  />
                </label>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button type="submit" className="btn-primary">
                    Submit request
                  </button>
                  <button type="reset" className="btn-ghost">
                    Clear
                  </button>
                </div>
              </form>
            </div>

            <aside className="soft-panel p-5 sm:p-7">
              <p className="kicker">Quick links</p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-rose-ink">
                Helpful starts
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-rose-muted">
                <li>Tell us the date & delivery area</li>
                <li>Choose a color vibe (rose, mint, neutral)</li>
                <li>Share inspiration photos (if any)</li>
              </ul>
              <div className="mt-6 rounded-2xl border border-rose-line/80 bg-white/60 p-4">
                <p className="kicker">Tip</p>
                <p className="mt-2 text-sm leading-6">
                  The more details you share, the more premium the final curation will feel.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

