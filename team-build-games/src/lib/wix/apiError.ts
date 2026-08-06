/** Best-effort extraction of HTTP status / app error code from a thrown Wix SDK error. */

export function errorStatus(e: unknown): number | null {
  const any = e as { status?: number; response?: { status?: number }; details?: { httpStatus?: number } };
  return any?.status ?? any?.response?.status ?? any?.details?.httpStatus ?? null;
}

export function errorCode(e: unknown): string | undefined {
  const any = e as { details?: { applicationError?: { code?: string } }; code?: string };
  return any?.details?.applicationError?.code ?? any?.code;
}
