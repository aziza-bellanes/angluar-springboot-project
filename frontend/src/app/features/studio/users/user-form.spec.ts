import { describe, expect, it } from 'vitest';
import { toUserFormValue, toUserRequest, userErrorMessage } from './user-form';
import { RoleInfo, UserProfile } from '@app/core/models/api.models';

describe('userErrorMessage', () => {
  it('maps known codes to friendly messages', () => {
    expect(userErrorMessage('email_taken', 'x')).toBe('An account already exists for this email.');
    expect(userErrorMessage('last_admin', 'x')).toContain('administrator');
  });

  it('falls back for unknown or missing codes', () => {
    expect(userErrorMessage('other', 'Server said no')).toBe('Server said no');
    expect(userErrorMessage(undefined, 'Server said no')).toBe('Server said no');
  });
});

describe('toUserRequest', () => {
  const base = {
    firstName: ' Berthe ',
    lastName: 'Morisot',
    email: ' b@x.org ',
    phone: '  ',
    password: '',
    roleIds: [17],
    enabled: true,
  };

  it('trims values, nulls a blank phone and omits an empty password', () => {
    expect(toUserRequest(base)).toEqual({
      firstName: 'Berthe',
      lastName: 'Morisot',
      email: 'b@x.org',
      phone: null,
      password: null,
      roleIds: [17],
      enabled: true,
    });
  });

  it('keeps a provided password', () => {
    expect(toUserRequest({ ...base, password: 'Secret123' }).password).toBe('Secret123');
  });
});

describe('database role selections', () => {
  const catalogue: RoleInfo[] = [
    { id: 3, name: 'Collectors', profile: 'BIDDER', system: true, userCount: 2 },
    { id: 17, name: 'Guest curator', profile: 'COLLABORATEUR', system: false, userCount: 1 },
  ];
  const user: UserProfile = {
    id: 7,
    firstName: 'Test',
    lastName: 'Curator',
    email: 'test@local.dev',
    enabled: true,
    roles: ['COLLABORATEUR'],
    roleIds: [17],
    createdAt: '2026-11-18T10:00:00Z',
  };

  it('keeps a custom role assignment instead of replacing it with a permission profile', () => {
    expect(toUserFormValue(user, catalogue).roleIds).toEqual([17]);
    expect(toUserRequest(toUserFormValue(user, catalogue)).roleIds).toEqual([17]);
  });

  it('selects the built-in bidder by identity and profile even after its label changes', () => {
    expect(toUserFormValue(null, catalogue).roleIds).toEqual([3]);
  });

  it('preserves an explicitly empty selection for validation', () => {
    expect(toUserFormValue({ ...user, roleIds: [] }, catalogue).roleIds).toEqual([]);
  });
});
