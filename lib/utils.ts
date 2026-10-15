/** Minimal class name helper (keeps the dependency footprint at zero). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
