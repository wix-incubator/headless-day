/**
 * Shared helpers for server-only Wix Data writes (impure Wix adapter). Collections used by
 * trusted API routes are auto-created on first write so the site needs no dashboard setup;
 * writes stay behind elevated app creds, so every permission role is ADMIN.
 */

import { auth } from "@wix/essentials";
import { collections } from "@wix/data";

export function isMissingCollection(e: unknown): boolean {
  const text = `${(e as Error)?.message ?? ""} ${JSON.stringify((e as { details?: unknown })?.details ?? "")}`;
  return /not[_ ]?found|does not exist|WDE0025/i.test(text);
}

export async function createAdminCollection(
  id: string,
  displayName: string,
  fieldKeys: string[],
): Promise<void> {
  const TEXT = collections.Type.TEXT;
  const ADMIN = collections.Role.ADMIN;
  await auth.elevate(collections.createDataCollection)({
    _id: id,
    displayName,
    fields: fieldKeys.map((key) => ({ key, type: TEXT })),
    permissions: { insert: ADMIN, update: ADMIN, remove: ADMIN, read: ADMIN },
  });
}

/** Run a write; if the collection doesn't exist yet, create it and retry once. */
export async function withCollection<T>(
  write: () => Promise<T>,
  ensure: () => Promise<void>,
): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (!isMissingCollection(e)) throw e;
    await ensure();
    return await write();
  }
}
