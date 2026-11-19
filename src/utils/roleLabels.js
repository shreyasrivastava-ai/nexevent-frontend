// src/utils/roleLabels.js
export const ROLE_LABEL = {
  SUPER_DEAN: 'Super Dean',
  FACULTY:    'Faculty',
  CLUB_LEAD:  'Club Lead',
  STUDENT:    'Student',
};

/**
 * Human-readable role name with a safe fallback.
 * @param {string} role
 * @returns {string}
 */
export function roleLabel(role) {
  return ROLE_LABEL[role] ?? role ?? 'Member';
}