'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { JobPosting } from '@/types';
import {
  MapPin,
  Calendar,
  Building2,
  Users,
  ArrowUpRight,
  Clock,
  Bookmark,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';

interface JobCardProps {
  job: JobPosting;
  onClick?: (job: JobPosting) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (jobId: string) => void;
}

const employmentTypeLabels: Record<string, string> = {
  INTERN: '인턴',
  CONTRACT: '계약직',
  REGULAR: '정규직',
  OTHER: '기타',
};

const dutyCategoryLabels: Record<string, string> = {
  DATA: '데이터',
  DEVELOPMENT: '개발',
  MARKETING: '마케팅',
  DESIGN: '디자인',
  HR: '인사',
  FINANCE: '재무/회계',
  ADMINISTRATION: '행정',
  RESEARCH: '연구',
  OTHER: '기타',
};

export function JobCard({
  job,
  onClick,
  isBookmarked,
  onToggleBookmark,
}: JobCardProps) {
  const daysUntilDeadline = job.applyEndAt
    ? differenceInDays(new Date(job.applyEndAt), new Date())
    : null;

  const isExpired = job.applyEndAt ? isPast(new Date(job.applyEndAt)) : false;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && !isExpired;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1',
        'cursor-pointer border-border/50',
        isExpired && 'opacity-60'
      )}
      onClick={() => onClick?.(job)}
    >
      {/* Urgent indicator */}
      {isUrgent && (
        <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
          <div className="absolute top-3 -right-6 w-28 transform rotate-45 bg-destructive text-destructive-foreground text-[10px] font-semibold text-center py-1 animate-pulse-soft">
            D-{daysUntilDeadline}
          </div>
        </div>
      )}

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">
                {job.orgName}
              </span>
            </div>
            <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
              {job.title}
            </h3>
          </div>

          <div className="flex items-center gap-1">
            {onToggleBookmark && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleBookmark(job.id);
                }}
                className={cn(
                  'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all',
                  isBookmarked
                    ? 'bg-primary/10 text-primary'
                    : 'bg-secondary opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary'
                )}
              >
                <Bookmark className={cn('w-4 h-4', isBookmarked && 'fill-current')} />
              </button>
            )}
            <div className="shrink-0 w-9 h-9 rounded-full bg-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge
            variant={job.isInternship ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-medium',
              job.isInternship && 'bg-accent text-accent-foreground'
            )}
          >
            {employmentTypeLabels[job.employmentType] || job.employmentType}
          </Badge>

          {job.dutyCategories.slice(0, 2).map((category) => (
            <Badge
              key={category}
              variant="outline"
              className="text-xs font-normal"
            >
              {dutyCategoryLabels[category] || category}
            </Badge>
          ))}

          {job.dutyCategories.length > 2 && (
            <Badge variant="outline" className="text-xs font-normal">
              +{job.dutyCategories.length - 2}
            </Badge>
          )}
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {job.regions.length > 0 && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate max-w-[100px]">
                {job.regions.slice(0, 2).join(', ')}
                {job.regions.length > 2 && ` 외 ${job.regions.length - 2}`}
              </span>
            </div>
          )}

          {job.headcountText && (
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>{job.headcountText}</span>
            </div>
          )}
        </div>

        {/* Footer - Deadline */}
        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {isUrgent ? (
              <Clock className="w-3.5 h-3.5 text-destructive" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span
              className={cn(
                'text-sm',
                isUrgent ? 'text-destructive font-medium' : 'text-muted-foreground',
                isExpired && 'line-through'
              )}
            >
              {job.applyEndAt
                ? isExpired
                  ? '마감됨'
                  : `~${format(new Date(job.applyEndAt), 'M.d(E)', { locale: ko })}`
                : '상시채용'}
            </span>
          </div>

          {!isExpired && daysUntilDeadline !== null && (
            <span
              className={cn(
                'text-xs font-medium px-2 py-0.5 rounded-full',
                isUrgent
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {daysUntilDeadline === 0 ? '오늘 마감' : `D-${daysUntilDeadline}`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Skeleton for loading state
export function JobCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="h-4 w-24 bg-muted rounded animate-shimmer mb-2" />
            <div className="h-5 w-full bg-muted rounded animate-shimmer" />
          </div>
        </div>

        <div className="flex gap-1.5 mb-4">
          <div className="h-5 w-14 bg-muted rounded animate-shimmer" />
          <div className="h-5 w-16 bg-muted rounded animate-shimmer" />
        </div>

        <div className="flex gap-4">
          <div className="h-4 w-20 bg-muted rounded animate-shimmer" />
          <div className="h-4 w-16 bg-muted rounded animate-shimmer" />
        </div>

        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="h-4 w-24 bg-muted rounded animate-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}
