import { RoleName } from '@app/core/models/api.models';

export const ROLE_PROFILES: Record<RoleName, { label: string; hint: string }> = {
  ADMIN: { label: 'Admin', hint: 'Full catalogue access, auctions, users and roles.' },
  COLLABORATEUR: {
    label: 'Collaborateur',
    hint: 'View and create artists, exhibitions and artworks.',
  },
  BIDDER: { label: 'Bidder', hint: 'Place bids and use a collector account.' },
};

export function roleErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case 'role_name_taken':
      return 'This role name is already used or reserved. Choose another name.';
    case 'role_in_use':
      return 'Unassign this role from all users before changing its permissions or deleting it.';
    case 'system_role':
      return 'Required system roles can be renamed, but their permissions and existence must be kept.';
    default:
      return fallback;
  }
}
