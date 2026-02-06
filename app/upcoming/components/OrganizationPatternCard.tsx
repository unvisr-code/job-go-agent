'use client';

import { Building2, Calendar, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OrganizationPattern, OrganizationPatternExtended } from '@/types';

interface OrganizationPatternCardProps {
  pattern: OrganizationPattern | OrganizationPatternExtended;
  onClick?: () => void;
}

const MONTH_NAMES = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export function OrganizationPatternCard({ pattern, onClick }: OrganizationPatternCardProps) {
  const lastPostedDate = pattern.lastPostedAt
    ? new Date(pattern.lastPostedAt)
    : null;

  const daysSinceLastPost = lastPostedDate
    ? Math.floor((Date.now() - lastPostedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      className={`glass rounded-xl p-4 border border-border/50 hover:border-primary/30 transition-colors ${
        onClick ? 'cursor-pointer hover:shadow-md' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-1">
              {pattern.orgName}
            </h3>
            <p className="text-xs text-muted-foreground">
              총 {pattern.totalJobs}건
            </p>
          </div>
        </div>
      </div>

      {/* 주로 채용하는 월 */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">주요 채용 시기</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {pattern.typicalMonths.map((month) => (
            <Badge
              key={month}
              variant="secondary"
              className="text-xs px-2 py-0.5"
            >
              {MONTH_NAMES[month]}
            </Badge>
          ))}
        </div>
      </div>

      {/* 마지막 공고 */}
      {lastPostedDate && (
        <div className="pt-3 border-t border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                마지막 공고:{' '}
                {lastPostedDate.toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
                {daysSinceLastPost !== null && (
                  <span className="ml-1">({daysSinceLastPost}일 전)</span>
                )}
              </span>
            </div>
            {onClick && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          {pattern.mostRecentTitle && (
            <p className="text-xs text-foreground/80 mt-1 line-clamp-1">
              {pattern.mostRecentTitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function OrganizationPatternCardSkeleton() {
  return (
    <div className="glass rounded-xl p-4 border border-border/50 animate-pulse">
      <div className="flex items-start gap-2 mb-3">
        <div className="w-9 h-9 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-4 bg-muted rounded w-3/4 mb-1" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-1/3 mb-2" />
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-5 bg-muted rounded w-10" />
        ))}
      </div>
    </div>
  );
}
