export const STATUS_TYPES = ["open", "closed", "in-progress"] as const;
export const IMPROVEMENT_STATUS = ["improving", "stable", "worsening", "varialbe"] as const;
export const SEVERITY_TYPES = ["mild", "moderate", "severe", "varialbe"] as const;

export const MAX_CHAR_SHORT = 100;
export const MAX_CHAR_MEDIUM = 1000;
export const MAX_CHAR_LONG = 10_000;

export function maxValidationMessage(item: string, max: number) {
  return `${item} must be less than ${max} characters`;
}

export function minValidationMessage(item: string, min: number) {
  return `${item} should be more than ${min} characters`;
}
