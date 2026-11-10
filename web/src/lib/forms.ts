import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '@/api/client';

/**
 * Maps API validation details onto form fields.
 * Returns a message for the form-level error slot when nothing could be attached to a field.
 */
export function applyApiError<T extends FieldValues>(
  err: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): string | null {
  if (!isApiError(err)) return 'Could not reach the server. Check your connection and try again.';
  let attached = false;
  for (const d of err.details) {
    if (fields.includes(d.path)) {
      setError(d.path as Path<T>, { message: d.message });
      attached = true;
    }
  }
  return attached ? null : err.message;
}
