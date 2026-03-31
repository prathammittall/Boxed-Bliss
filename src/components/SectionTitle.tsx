import LoadingLink from "@/components/routeLoading/LoadingLink";

export default function SectionTitle({
  title,
  subtitle,
  centered = false,
}: {
  title: string;
  subtitle?: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-7 ${centered ? "text-center" : ""}`}>
      <div className="section-divider mb-7" aria-hidden="true" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-display text-4xl leading-tight text-rose-ink sm:text-5xl">
            {title}
          </h2>
          {subtitle ? <p className="mt-2 text-sm text-rose-muted">{subtitle}</p> : null}
        </div>
        <LoadingLink href="/collections" className="btn-ghost hidden sm:inline-flex">
          View all
        </LoadingLink>
      </div>
    </div>
  );
}

