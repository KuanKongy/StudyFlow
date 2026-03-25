const USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
const USERNAME_MAX = 30;
const DISPLAY_NAME_MAX = 30;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateUsername(value: string): ValidationResult {
  if (!value || value.length === 0) {
    return { valid: false, error: 'Username is required' };
  }
  if (value.length > USERNAME_MAX) {
    return { valid: false, error: `Username must be ${USERNAME_MAX} characters or fewer` };
  }
  if (/\s/.test(value)) {
    return { valid: false, error: 'Username cannot contain spaces' };
  }
  if (!USERNAME_REGEX.test(value)) {
    return { valid: false, error: 'Only letters, numbers, periods, and underscores allowed' };
  }
  return { valid: true };
}

export function validateDisplayName(value: string): ValidationResult {
  if (value.length > DISPLAY_NAME_MAX) {
    return { valid: false, error: `Display name must be ${DISPLAY_NAME_MAX} characters or fewer` };
  }
  return { valid: true };
}

export const LIMITS = {
  USERNAME: USERNAME_MAX,
  DISPLAY_NAME: DISPLAY_NAME_MAX,
  GROUP_NAME: 50,
  GROUP_DESCRIPTION: 200,
  TOPIC_TITLE: 60,
  TOPIC_DESCRIPTION: 200,
  NOTE_TITLE: 100,
  FLASHCARD_SET_TITLE: 100,
  NOTE_CONTENT: 50_000,
  FLASHCARD_QUESTION: 500,
  FLASHCARD_ANSWER: 1_000,
} as const;
