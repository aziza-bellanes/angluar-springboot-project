import { RoleName, UserProfile, UserRequest } from '@app/core/models/api.models';
import { blankToNull } from '../shared/form-errors';

export const ROLE_OPTIONS: { name: RoleName; label: string; hint: string }[] = [
  { name: 'ADMIN', label: 'Admin', hint: 'Full access, auctions and users.' },
  {
    name: 'COLLABORATEUR',
    label: 'Collaborateur',
    hint: 'Can view and create artists, exhibitions and artworks.',
  },
  { name: 'BIDDER', label: 'Bidder', hint: 'Can place bids in auctions.' },
];

const ERROR_MESSAGES: Record<string, string> = {
  email_taken: 'An account already exists for this email.',
  cannot_delete_self: 'You cannot delete your own account.',
  last_admin: 'At least one enabled administrator must remain.',
  user_has_activity:
    'This user has bids or created content and cannot be deleted. Disable the account instead.',
  self_demotion: 'You cannot remove your own Admin role.',
  self_disable: 'You cannot disable your own account.',
};

/** Friendly message for a user-administration error code, or the fallback when the code is unknown. */
export function userErrorMessage(code: string | undefined, fallback: string): string {
  return (code && ERROR_MESSAGES[code]) || fallback;
}

export interface UserFormValue {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  roles: RoleName[];
  enabled: boolean;
}

/** Builds the API request; a blank password is omitted so the server keeps the current one. */
export function toUserRequest(value: UserFormValue): UserRequest {
  return {
    firstName: value.firstName.trim(),
    lastName: value.lastName.trim(),
    email: value.email.trim(),
    phone: blankToNull(value.phone),
    password: value.password ? value.password : null,
    roles: value.roles,
    enabled: value.enabled,
  };
}

export function toUserFormValue(user: UserProfile | null): UserFormValue {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    roles: user ? [...user.roles] : ['BIDDER'],
    enabled: user?.enabled ?? true,
  };
}
