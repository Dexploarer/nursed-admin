
import { Student } from '@/types';

const STORAGE_KEY = 'nursed_recently_viewed';
const MAX_RECENT = 5;

export interface RecentlyViewedStudent {
  id: string;
  firstName: string;
  lastName: string;
  timestamp: number;
}

/**
 * Add a student to recently viewed list
 */
export function addRecentlyViewed(student: Student) {
  if (typeof window === 'undefined') return;

  try {
    const existing = getRecentlyViewed();

    // Remove if already in list
    const filtered = existing.filter(s => s.id !== student.id);

    // Add to beginning
    const updated: RecentlyViewedStudent[] = [
      {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        timestamp: Date.now(),
      },
      ...filtered,
    ].slice(0, MAX_RECENT);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update recently viewed:', error);
  }
}

/**
 * Get recently viewed students
 */
export function getRecentlyViewed(): RecentlyViewedStudent[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as RecentlyViewedStudent[];
    return parsed.slice(0, MAX_RECENT);
  } catch (error) {
    console.error('Failed to load recently viewed:', error);
    return [];
  }
}

/**
 * Clear recently viewed list
 */
export function clearRecentlyViewed() {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear recently viewed:', error);
  }
}
