export const PRO_PLANS = ["artist", "venue"] as const;

export type ProPlan = (typeof PRO_PLANS)[number];

/** Durata dell'accesso manuale/una tantum: 12 mesi. */
export const PRO_ACCESS_MONTHS = 12;

/** Prezzi del pass annuale, in centesimi. Non ancora mostrati in 11A. */
export const PRO_PRICE_CENTS: Record<ProPlan, number> = {
  artist: 4900,
  venue: 14900,
};

export function isProPlan(value: string): value is ProPlan {
  return PRO_PLANS.includes(value as ProPlan);
}
