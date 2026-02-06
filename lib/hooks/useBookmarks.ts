'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'job-go-bookmarks';

export interface BookmarkedJob {
  id: string;
  savedAt: string;
}

function loadBookmarks(): BookmarkedJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveToStorage(bookmarks: BookmarkedJob[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  } catch (error) {
    console.error('Failed to save bookmarks:', error);
  }
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkedJob[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // 클라이언트에서만 localStorage 로드 (마운트 시 1회)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage 초기 로드는 유효한 패턴
    setBookmarks(loadBookmarks());
    setIsLoaded(true);
  }, []);

  const isBookmarked = useCallback(
    (jobId: string) => bookmarks.some((b) => b.id === jobId),
    [bookmarks]
  );

  const addBookmark = useCallback((jobId: string) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === jobId)) return prev;
      const updated = [...prev, { id: jobId, savedAt: new Date().toISOString() }];
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const removeBookmark = useCallback((jobId: string) => {
    setBookmarks((prev) => {
      const updated = prev.filter((b) => b.id !== jobId);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const toggleBookmark = useCallback((jobId: string) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.id === jobId);
      const updated = exists
        ? prev.filter((b) => b.id !== jobId)
        : [...prev, { id: jobId, savedAt: new Date().toISOString() }];
      saveToStorage(updated);
      return updated;
    });
  }, []);

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
