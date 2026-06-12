/**
 * Extracts a user-friendly error message from an HTTP error response.
 *
 * The backend returns errors as a `ProblemDetails` object where the
 * specific, human-readable explanation is in the `detail` field
 * (e.g. "A category with the slug 'travel' already exists."), while
 * `title`/`message` tend to hold generic category names such as
 * "Conflict" or "Application Error".
 *
 * This helper prioritizes `detail`, falling back to `message`/`title`,
 * and finally to the provided fallback message.
 */
export function extractApiErrorMessage(err: unknown, fallback = 'An unexpected error occurred.'): string {
  const e = err as { error?: { detail?: string; message?: string; title?: string } };
  return e?.error?.detail ?? e?.error?.message ?? e?.error?.title ?? fallback;
}
