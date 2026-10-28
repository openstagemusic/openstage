import LocaleLink from "@/components/i18n/LocaleLink";
import type { Dictionary } from "@/i18n/dictionaries/en";
import type { AdminMetrics } from "@/lib/admin/queries";

/**
 * Il quadro generale delle cose da fare.
 *
 * Non è una seconda coda: sono solo i numeri che contano, ognuno con il link
 * alla scheda dove la coda si gestisce davvero. Così la panoramica resta un
 * colpo d'occhio e non un elenco lunghissimo.
 */
export default function AdminTodo({
  metrics,
  profilesToVerify,
  takedownOpen,
  dict,
}: {
  metrics: AdminMetrics | null;
  profilesToVerify: number;
  takedownOpen: number;
  dict: Dictionary["admin"];
}) {
  if (!metrics) return null;

  const items: Array<{
    label: string;
    value: number;
    detail?: string;
    href?: string;
  }> = [
    { label: dict.kpiPending, value: metrics.claimsPending, href: "/admin/claim" },
    { label: dict.kpiVerify, value: metrics.claimsToVerify, href: "/admin/claim" },
    { label: dict.kpiUnverified, value: profilesToVerify, href: "/admin/utenti" },
    { label: dict.kpiDrafts, value: metrics.eventsDraft, href: "/admin/bozze" },
    { label: dict.kpiMessages, value: metrics.messagesNew, href: "/admin/messaggi" },
    { label: dict.kpiTakedown, value: takedownOpen, href: "/admin/takedown" },
    { label: dict.metricsReportsOpen, value: metrics.reportsOpen, href: "/admin/segnalazioni" },
    { label: dict.metricsEmailQueued, value: metrics.emailQueued },
    {
      label: dict.metricsEmailFailed,
      value: metrics.emailFailed,
      detail: dict.todoEmailDetail
        .replace("{queued}", String(metrics.emailQueued))
        .replace("{failed}", String(metrics.emailFailed)),
    },
  ];

  const pending = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="mt-8">
      <h2 className="font-display text-2xl font-semibold">{dict.overviewTitle}</h2>
      <p className="mt-1 text-sm text-muted">{dict.todoText}</p>

      {pending === 0 ? (
        <p className="mt-4 border-l-2 border-cyan bg-cyan/10 px-4 py-3 text-sm text-white">
          {dict.todoClear}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item) => {
          const content = (
            <>
              <p
                className={
                  item.value > 0
                    ? "font-poster text-2xl leading-none text-white sm:text-3xl"
                    : "font-poster text-2xl leading-none text-muted sm:text-3xl"
                }
              >
                {item.value}
              </p>
              <p className="mt-1.5 font-mono text-[9px] uppercase leading-tight tracking-[0.1em] text-muted">
                {item.label}
              </p>
              {item.detail ? <p className="mt-1 text-[10px] text-muted">{item.detail}</p> : null}
            </>
          );

          const className =
            item.value > 0
              ? "border border-cyan/40 bg-cyan/[0.06] p-3 transition-colors hover:border-cyan"
              : "border border-line bg-surface/40 p-3";

          return item.href ? (
            <LocaleLink key={item.label} href={item.href} className={className}>
              {content}
            </LocaleLink>
          ) : (
            <div key={item.label} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
