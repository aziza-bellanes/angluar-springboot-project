import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoleName, UserProfile } from '../models/api.models';
import { authGuard, guestGuard, roleGuard } from './guards';

const route = {} as ActivatedRouteSnapshot;
const stateFor = (url: string) => ({ url }) as RouterStateSnapshot;

/** Writes a valid session to localStorage; must run before AuthStore is first injected. */
function seedSession(roles: RoleName[] | null): void {
  localStorage.clear();
  if (roles === null) {
    return;
  }
  const user: UserProfile = {
    id: 1,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.test',
    enabled: true,
    roles,
    createdAt: '2026-01-01T00:00:00Z',
  };
  const session = { token: 't', expiresAt: new Date(Date.now() + 3_600_000).toISOString(), user };
  localStorage.setItem('atelier.session', JSON.stringify(session));
}

function configure(): void {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
}

describe('authGuard', () => {
  beforeEach(() => localStorage.clear());

  it('redirects a signed-out visitor to /login with the requested URL', () => {
    seedSession(null);
    configure();
    const result = TestBed.runInInjectionContext(() => authGuard(route, stateFor('/account'))) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString().split('?')[0]).toBe('/login');
    expect(result.queryParams['returnUrl']).toBe('/account');
  });

  it('allows a signed-in visitor through', () => {
    seedSession(['BIDDER']);
    configure();
    expect(TestBed.runInInjectionContext(() => authGuard(route, stateFor('/account')))).toBe(true);
  });
});

describe('roleGuard', () => {
  beforeEach(() => localStorage.clear());

  it('redirects a bidder away from an admin-only route to /forbidden', () => {
    seedSession(['BIDDER']);
    configure();
    const result = TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, stateFor('/admin'))) as UrlTree;

    expect(result).toBeInstanceOf(UrlTree);
    expect(result.toString()).toBe('/forbidden');
  });

  it('allows an admin through an admin-only route', () => {
    seedSession(['ADMIN']);
    configure();
    expect(TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, stateFor('/admin')))).toBe(true);
  });

  it('sends a signed-out visitor to /login rather than /forbidden', () => {
    seedSession(null);
    configure();
    const result = TestBed.runInInjectionContext(() => roleGuard('ADMIN')(route, stateFor('/admin'))) as UrlTree;

    expect(result.toString().split('?')[0]).toBe('/login');
    expect(result.queryParams['returnUrl']).toBe('/admin');
  });
});

describe('guestGuard', () => {
  beforeEach(() => localStorage.clear());

  it('sends a signed-in staff user to /studio', () => {
    seedSession(['ADMIN']);
    configure();
    const result = TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login'))) as UrlTree;
    expect(result.toString()).toBe('/studio');
  });

  it('sends a signed-in bidder to /account', () => {
    seedSession(['BIDDER']);
    configure();
    const result = TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login'))) as UrlTree;
    expect(result.toString()).toBe('/account');
  });

  it('lets a signed-out visitor see the login page', () => {
    seedSession(null);
    configure();
    expect(TestBed.runInInjectionContext(() => guestGuard(route, stateFor('/login')))).toBe(true);
  });
});
