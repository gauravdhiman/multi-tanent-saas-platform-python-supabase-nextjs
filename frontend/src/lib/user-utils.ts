/**
 * Utility functions for user-related operations.
 */

/**
 * Extract first name and last name from user metadata with fallback to full name or name.
 * @param userMetadata - The user metadata object from auth provider
 * @returns An object containing firstName and lastName
 */
export function extractFirstLastName(userMetadata: Record<string, string | undefined> = {}): { firstName: string; lastName: string } {
  let firstName = userMetadata.first_name || '';
  let lastName = userMetadata.last_name || '';

 // If first_name or last_name is missing, try to extract from full_name or name
  if (!firstName || !lastName) {
    const fullName = userMetadata.full_name;
    if (fullName) {
      const nameParts = fullName.trim().split(/\s+/);
      firstName = firstName || nameParts[0] || '';
      lastName = lastName || nameParts.slice(1).join(' ') || '';
    } else {
      const name = userMetadata.name;
      if (name) {
        const nameParts = name.trim().split(/\s+/);
        firstName = firstName || nameParts[0] || '';
        lastName = lastName || nameParts.slice(1).join(' ') || '';
      }
    }
 }

  return { firstName, lastName };
}
