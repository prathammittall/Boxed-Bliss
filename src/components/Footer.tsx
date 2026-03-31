import Image from "next/image";
import LoadingLink from "@/components/routeLoading/LoadingLink";

const footerGroups = [
  {
    title: "Discover",
    links: [
      { label: "Join our bliss circle", href: "/join" },
      { label: "Customer service", href: "/customer-service" },
      { label: "Track order", href: "/order-status" },
    ],
  },
  {
    title: "Inquiry",
    links: [
      { label: "Privacy policy", href: "/privacy-policy" },
      { label: "Shipping & returns", href: "/shipping-returns" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-rose-line/80 pb-10 pt-12">
      <div className="site-shell grid gap-8 text-[0.66rem] uppercase tracking-[0.17em] text-rose-muted sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <Image
              src="/brand/logo-bg.png"
              alt="The Boxed Bliss"
              width={38}
              height={38}
              className="h-9 w-9 rounded-full border border-rose-line/80 object-cover"
            />
            <p className="font-script text-xl normal-case tracking-normal text-rose-ink">
              The Boxed Bliss
            </p>
          </div>
          <p className="mt-3 text-[0.6rem] uppercase tracking-[0.15em] text-rose-muted">
            {new Date().getFullYear()} Boxed Bliss. Crafted with intentional joy.
          </p>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-3 text-[0.62rem] font-medium text-rose-ink">{group.title}</h3>
            <ul className="space-y-2 text-[0.6rem]">
              {group.links.map((link) => (
                <li key={link.href}>
                  <LoadingLink href={link.href} className="transition hover:text-rose-ink">
                    {link.label}
                  </LoadingLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
