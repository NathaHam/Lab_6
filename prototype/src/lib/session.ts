import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";

// PROTOTYPE ONLY — demo "sign-in". The acting user is chosen from a cookie that
// anyone can change. There is no password, MFA, or session security here; the
// production design (FR-001 / NFR-001) requires verified email + password + TOTP
// with server-side sessions.
export const DEMO_USER_COOKIE = "splitsmart_demo_user";

export async function getCurrentUser() {
  const store = await cookies();
  const id = store.get(DEMO_USER_COOKIE)?.value;
  const user = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (user) return user;
  // Fall back to the first demo user so the app is usable without choosing.
  return prisma.user.findFirst({ orderBy: { name: "asc" } });
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No demo users exist yet. Run `npm run db:seed` in prototype/.");
  return user;
}
