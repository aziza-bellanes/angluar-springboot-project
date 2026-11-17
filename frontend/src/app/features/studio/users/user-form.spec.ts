import { describe, expect, it } from 'vitest';
import { toUserRequest, userErrorMessage } from './user-form';

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
    roles: ['BIDDER' as const],
    enabled: true,
  };

  it('trims values, nulls a blank phone and omits an empty password', () => {
    expect(toUserRequest(base)).toEqual({
      firstName: 'Berthe',
      lastName: 'Morisot',
      email: 'b@x.org',
      phone: null,
      password: null,
      roles: ['BIDDER'],
      enabled: true,
    });
  });

  it('keeps a provided password', () => {
    expect(toUserRequest({ ...base, password: 'Secret123' }).password).toBe('Secret123');
  });
});
