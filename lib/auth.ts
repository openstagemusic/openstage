/**
 * Admin check based on the ADMIN_EMAIL environment variable.
 * The database remains the source of truth for RLS (see `public.is_admin()`);
 * this helper is used for UI/route decisions in the app layer.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}
