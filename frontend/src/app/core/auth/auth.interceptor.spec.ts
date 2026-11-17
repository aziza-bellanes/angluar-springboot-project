import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { authInterceptor } from './auth.interceptor';
import { AuthStore } from './auth.store';

const STORAGE_KEY = 'atelier.session';

function seedSignedIn(): void {
  const session = {
    token: 'tok-123',
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    user: {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.test',
      enabled: true,
      roles: ['BIDDER'],
      createdAt: '2026-01-01T00:00:00Z',
    },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: '**', children: [] }]),
      ],
    });
  });

  it('adds a bearer token to /api/ calls when signed in', () => {
    seedSignedIn();
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    http.get('/api/artists').subscribe();

    const req = ctrl.expectOne('/api/artists');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-123');
    req.flush([]);
    ctrl.verify();
  });

  it('does not add a token to non-/api URLs', () => {
    seedSignedIn();
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    http.get('/assets/catalogue.json').subscribe();

    const req = ctrl.expectOne('/assets/catalogue.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
    ctrl.verify();
  });

  it('does not add a token to /api/ calls when signed out', () => {
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    http.get('/api/artists').subscribe();

    const req = ctrl.expectOne('/api/artists');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush([]);
  });

  it('ends the session and clears storage on a 401 from a non-auth call', () => {
    seedSignedIn();
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);
    expect(store.isAuthenticated()).toBe(true);

    let failed = false;
    http.get('/api/studio/orders').subscribe({ error: () => (failed = true) });

    ctrl.expectOne('/api/studio/orders').flush(
      { detail: 'Token expired' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(failed).toBe(true);
    expect(store.isAuthenticated()).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('keeps the session when the login call itself returns 401', () => {
    seedSignedIn();
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpClient);
    const ctrl = TestBed.inject(HttpTestingController);

    http.post('/api/auth/login', { email: 'x', password: 'y' }).subscribe({ error: () => undefined });

    ctrl.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(store.isAuthenticated()).toBe(true);
  });
});
