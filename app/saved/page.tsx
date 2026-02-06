'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { JobCard, JobCardSkeleton } from '@/components/JobCard';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { useBookmarks } from '@/lib/hooks/useBookmarks';
import type { JobPosting } from '@/types';
import { Bookmark, Sparkles } from 'lucide-react';

export default function SavedJobsPage() {
  const router = useRouter();
  const { bookmarks, isLoaded, isBookmarked, toggleBookmark } = useBookmarks();
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch job details for bookmarked jobs
  useEffect(() => {
    if (!isLoaded) return;

    const fetchJobs = async () => {
      if (bookmarks.length === 0) {
        setJobs([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const jobIds = bookmarks.map((b) => b.id);

        // Fetch each job (or create a batch endpoint if needed)
        const jobPromises = jobIds.map(async (id) => {
          const res = await fetch(`/api/jobs/${id}`);
          if (!res.ok) return null;
          return res.json() as Promise<JobPosting>;
        });

        const results = await Promise.all(jobPromises);
        const validJobs = results.filter((job): job is JobPosting => job !== null);

        // Sort by saved date (most recent first)
        const sortedJobs = validJobs.sort((a, b) => {
          const aBookmark = bookmarks.find((bm) => bm.id === a.id);
          const bBookmark = bookmarks.find((bm) => bm.id === b.id);
          const aDate = aBookmark ? new Date(aBookmark.savedAt).getTime() : 0;
          const bDate = bBookmark ? new Date(bBookmark.savedAt).getTime() : 0;
          return bDate - aDate;
        });

        setJobs(sortedJobs);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch saved jobs:', err);
        setError('스크랩한 공고를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, [bookmarks, isLoaded]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <BackButton fallbackUrl="/" className="mb-4" />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bookmark className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">효주님의 스크랩</h1>
            <p className="text-muted-foreground text-sm">
              관심있는 공고를 모아봤어요
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>다시 시도</Button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && jobs.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">아직 스크랩한 공고가 없어요</h3>
          <p className="text-muted-foreground mb-4">
            관심있는 공고를 찾아서 스크랩해보세요
          </p>
          <Button onClick={() => router.push('/')}>공고 찾아보기</Button>
        </div>
      )}

      {/* Job grid */}
      {!isLoading && !error && jobs.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            총{' '}
            <span className="font-semibold text-foreground">{jobs.length}</span>
            개의 스크랩
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {jobs.map((job, index) => (
              <div
                key={job.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className="animate-in fade-in-0 slide-in-from-bottom-4"
              >
                <JobCard
                  job={job}
                  onClick={(job) => router.push(`/jobs/${job.id}`)}
                  isBookmarked={isBookmarked(job.id)}
                  onToggleBookmark={toggleBookmark}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
