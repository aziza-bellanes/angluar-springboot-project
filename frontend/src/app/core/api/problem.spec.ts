import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { messageOf, problemOf } from './problem';

describe('problemOf', () => {
  it('reports an offline problem when the server cannot be reached (status 0)', () => {
    const error = new HttpErrorResponse({ status: 0, statusText: 'Unknown Error', error: new ProgressEvent('error') });
    expect(problemOf(error)).toEqual({
      status: 0,
      code: 'offline',
      detail: 'The server cannot be reached. Check your connection.',
    });
  });

  it('reads code and detail from a 409 problem body', () => {
    const error = new HttpErrorResponse({
      status: 409,
      statusText: 'Conflict',
      error: { code: 'LOT_ALREADY_SOLD', detail: 'This lot has already been sold.' },
    });
    const problem = problemOf(error);
    expect(problem.status).toBe(409);
    expect(problem.code).toBe('LOT_ALREADY_SOLD');
    expect(problem.detail).toBe('This lot has already been sold.');
  });

  it('passes field errors through', () => {
    const error = new HttpErrorResponse({
      status: 400,
      statusText: 'Bad Request',
      error: { detail: 'Invalid input', fields: { email: 'must be a valid address' } },
    });
    expect(problemOf(error).fields).toEqual({ email: 'must be a valid address' });
  });

  it('falls back to the status text when the body has no detail', () => {
    const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error', error: null });
    expect(problemOf(error).detail).toBe('Internal Server Error');
  });

  it('describes a non-HTTP error as unexpected', () => {
    expect(problemOf(new Error('boom'))).toEqual({ status: -1, detail: 'Unexpected error' });
    expect(problemOf('nope')).toEqual({ status: -1, detail: 'Unexpected error' });
  });

  it('messageOf returns the detail text', () => {
    const error = new HttpErrorResponse({ status: 409, statusText: 'Conflict', error: { detail: 'Duplicate' } });
    expect(messageOf(error)).toBe('Duplicate');
    expect(messageOf(new Error('boom'))).toBe('Unexpected error');
  });
});
