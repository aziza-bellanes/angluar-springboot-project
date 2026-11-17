import { HttpErrorResponse } from '@angular/common/http';
import { ApiProblem } from '../models/api.models';

/** Extracts a user-friendly message from an API error (RFC 9457 problem detail). */
export function problemOf(error: unknown): ApiProblem {
  if (error instanceof HttpErrorResponse) {
    const body = (error.error ?? {}) as Partial<ApiProblem>;
    if (error.status === 0) {
      return { status: 0, code: 'offline', detail: 'The server cannot be reached. Check your connection.' };
    }
    return {
      status: error.status,
      code: body.code,
      detail: body.detail ?? error.statusText ?? 'Unexpected error',
      fields: body.fields,
    };
  }
  return { status: -1, detail: 'Unexpected error' };
}

export function messageOf(error: unknown): string {
  return problemOf(error).detail ?? 'Unexpected error';
}
