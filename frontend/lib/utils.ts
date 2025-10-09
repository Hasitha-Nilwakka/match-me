/**
 * Utility functions for the Match-Me application
 */

/**
 * Normalize an array of strings by trimming, lowercasing, and filtering out empty values
 */
export const normalize = (arr?: string[]): string[] =>
  Array.isArray(arr)
    ? arr.map((s) => (s || "").toLowerCase().trim()).filter(Boolean)
    : [];

/**
 * Calculate overlap score between two arrays of strings
 * Returns a percentage (0-100) representing how similar the arrays are
 */
export const overlapScore = (a?: string[], b?: string[]): number => {
  const A = new Set(normalize(a));
  const B = new Set(normalize(b));
  if (A.size === 0 || B.size === 0) return 0;
  
  let inter = 0;
  A.forEach((v) => {
    if (B.has(v)) inter += 1;
  });
  
  const union = new Set([...A, ...B]).size;
  const ratio = union === 0 ? 0 : inter / union;
  return Math.round(ratio * 100);
};

/**
 * Format a date for display in chat messages
 */
export const formatMessageTime = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString();
};

/**
 * Truncate text to a maximum length with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

/**
 * Check if a value is empty (null, undefined, empty string, or empty array)
 */
export const isEmpty = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/**
 * Generate a random ID for temporary use
 */
export const generateTempId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

/**
 * Debounce function to limit how often a function can be called
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};
