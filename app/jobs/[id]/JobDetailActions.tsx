'use client';

import { Button } from '@/components/ui/button';
import { useBookmarks } from '@/lib/hooks/useBookmarks';
import { ExternalLink, Bookmark, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JobDetailActionsProps {
  jobId: string;
  applyUrl: string | null;
  sourceUrl: string | null;
  isExpired: boolean;
}

export function JobDetailActions({
  jobId,
  applyUrl,
  sourceUrl,
  isExpired,
}: JobDetailActionsProps) {
  const { isBookmarked, toggleBookmark, isLoaded } = useBookmarks();
  const bookmarked = isBookmarked(jobId);

  // 지원하기/원문보기 URL (동일한 URL을 사용)
  const externalUrl = applyUrl || sourceUrl;

  const handleShare = async () => {
    const shareData = {
      title: '공채GO - 공공기관 채용공고',
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast notification
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {externalUrl && (
        <Button
          asChild
          size="lg"
          className={cn(
            'flex-1 gap-2 font-semibold',
            isExpired && 'opacity-60'
          )}
        >
          <a href={externalUrl} target="_blank" rel="noopener noreferrer">
            {isExpired ? '공고 보기 (마감됨)' : '지원하러 가기'}
            <ExternalLink className="w-4 h-4" />
          </a>
        </Button>
      )}

      <Button
        variant={bookmarked ? 'default' : 'outline'}
        size="lg"
        onClick={() => toggleBookmark(jobId)}
        disabled={!isLoaded}
        className={cn(
          'gap-2',
          bookmarked && 'bg-primary hover:bg-primary/90'
        )}
      >
        <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
        {bookmarked ? '스크랩됨' : '스크랩'}
      </Button>

      <Button
        variant="outline"
        size="lg"
        onClick={handleShare}
        className="gap-2"
      >
        <Share2 className="w-4 h-4" />
        공유
      </Button>
    </div>
  );
}
