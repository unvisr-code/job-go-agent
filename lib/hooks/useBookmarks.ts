'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'job-go-bookmarks';

export interface BookmarkedJob {
  id: string;
  savedAt: string;
}

// localStorage를 external store로 사용
function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): BookmarkedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function getServerSnapshot(): BookmarkedJob[] {
  return [];
}

export function useBookmarks() {
  const bookmarks = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const saveBookmarks = useCallback((newBookmarks: BookmarkedJob[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookmarks));
      // Trigger re-render by dispatching storage event
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }, []);

  const isBookmarked = useCallback(
    (jobId: string) => bookmarks.some((b) => b.id === jobId),
    [bookmarks]
  );

  const addBookmark = useCallback((jobId: string) => {
    const current = getSnapshot();
    if (current.some((b) => b.id === jobId)) return;
    saveBookmarks([...current, { id: jobId, savedAt: new Date().toISOString() }]);
  }, [saveBookmarks]);

  const removeBookmark = useCallback((jobId: string) => {
    const current = getSnapshot();
    saveBookmarks(current.filter((b) => b.id !== jobId));
  }, [saveBookmarks]);

  const toggleBookmark = useCallback(
    (jobId: string) => {
      if (isBookmarked(jobId)) {
        removeBookmark(jobId);
      } else {
        addBookmark(jobId);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  // useSyncExternalStore는 hydration 후 자동으로 로드됨
  const isLoaded = typeof window !== 'undefined';

  return {
    bookmarks,
    isLoaded,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    count: bookmarks.length,
  };
}
