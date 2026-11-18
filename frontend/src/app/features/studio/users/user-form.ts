import { RoleInfo, UserProfile, UserRequest } from '@app/core/models/api.models';
import { blankToNull } from '../shared/form-errors';

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
  roleIds: number[];
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
    roleIds: value.roleIds,
    enabled: value.enabled,
  };
}

export function assignedRoleIds(user: UserProfile, catalogue: RoleInfo[]): number[] {
  return (
    user.roleIds ??
    catalogue
      .filter((role) => role.system && user.roles.includes(role.profile))
      .map((role) => role.id)
  );
}

export function toUserFormValue(user: UserProfile | null, catalogue: RoleInfo[]): UserFormValue {
  return {
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    password: '',
    roleIds: user
      ? [...assignedRoleIds(user, catalogue)]
      : catalogue.filter((role) => role.system && role.profile === 'BIDDER').map((role) => role.id),
    enabled: user?.enabled ?? true,
  };
}
