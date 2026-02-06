'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  ExternalLink,
  Loader2,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { JobPosting } from '@/types';
import { useBookmarks } from '@/lib/hooks/useBookmarks';

interface JobDetailModalProps {
  jobId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function JobDetailModal({ jobId, open, onOpenChange }: JobDetailModalProps) {
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isBookmarked, toggleBookmark } = useBookmarks();

  useEffect(() => {
    if (!jobId || !open) {
      return;
    }

    let cancelled = false;

    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to load job');
        const data = await res.json();
        if (!cancelled) {
          setJob(data.job || data);
          setError(null);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('공고를 불러오는데 실패했습니다.');
          setIsLoading(false);
        }
      }
    };

    setJob(null);
    setError(null);
    setIsLoading(true);

    // Use setTimeout to defer the fetch and avoid synchronous setState in effect
    const timeoutId = setTimeout(fetchJob, 0);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [jobId, open]);

  const daysUntilDeadline = job?.applyEndAt
    ? differenceInDays(new Date(job.applyEndAt), new Date())
    : null;

  const isExpired = job?.applyEndAt ? isPast(new Date(job.applyEndAt)) : false;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && !isExpired;

  const handleApply = () => {
    const url = job?.applyUrl || job?.sourceUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            {error}
          </div>
        ) : job ? (
          <>
            {/* Header */}
            <DialogHeader className="p-6 pb-4 border-b">
              {/* 마감 임박 배너 */}
              {isUrgent && (
                <div className="mb-4 -mx-6 -mt-6 bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium">
                  마감까지 {daysUntilDeadline === 0 ? '오늘' : `D-${daysUntilDeadline}`} 남았습니다
                </div>
              )}
              {isExpired && (
                <div className="mb-4 -mx-6 -mt-6 bg-muted text-muted-foreground px-4 py-2 text-center text-sm font-medium">
                  이 공고는 마감되었습니다
                </div>
              )}

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-muted-foreground text-sm mb-1">{job.orgName}</p>
                  <DialogTitle className="text-lg font-bold leading-tight">
                    {job.title}
                  </DialogTitle>
                </div>
              </div>

              {/* 태그 */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Badge
                  variant="default"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  {employmentTypeLabels[job.employmentType] || job.employmentType}
                </Badge>
                {job.isInternship && (
                  <Badge variant="default" className="bg-accent text-accent-foreground">
                    인턴십
                  </Badge>
                )}
                {job.dutyCategories.map((category) => (
                  <Badge key={category} variant="outline">
                    {dutyCategoryLabels[category] || category}
                  </Badge>
                ))}
              </div>
            </DialogHeader>

            {/* Content */}
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="p-6 space-y-6">
                {/* 핵심 정보 */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                  {job.regions.length > 0 && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">근무지역</span>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{job.regions.join(', ')}</span>
                      </div>
                    </div>
                  )}

                  {job.headcountText && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">모집인원</span>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{job.headcountText}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground mb-1">접수기간</span>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">
                        {job.applyStartAt
                          ? format(new Date(job.applyStartAt), 'M.d', { locale: ko })
                          : '-'}{' '}
                        ~{' '}
                        {job.applyEndAt
                          ? format(new Date(job.applyEndAt), 'M.d', { locale: ko })
                          : '상시'}
                      </span>
                    </div>
                  </div>

                  {daysUntilDeadline !== null && !isExpired && (
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground mb-1">남은 기간</span>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-primary" />
                        <span className={`font-medium text-sm ${isUrgent ? 'text-destructive' : ''}`}>
                          {daysUntilDeadline === 0 ? '오늘 마감' : `D-${daysUntilDeadline}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 직무 내용 */}
                {job.dutiesText && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <Briefcase className="w-4 h-4 text-primary" />
                      직무 내용
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {job.dutiesText}
                    </p>
                  </div>
                )}

                {/* 지원 자격 */}
                {job.requirements.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                      지원 자격
                    </h3>
                    <ul className="space-y-1.5">
                      {job.requirements.map((req, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 전형 절차 */}
                {job.selectionSteps && job.selectionSteps.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-sm font-semibold mb-2">
                      <FileText className="w-4 h-4 text-primary" />
                      전형 절차
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {job.selectionSteps.map((step, i) => (
                        <div key={i} className="flex items-center">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 text-sm">
                            <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                              {step.order}
                            </span>
                            <span className="font-medium">{step.name}</span>
                          </div>
                          {i < job.selectionSteps!.length - 1 && (
                            <span className="mx-1.5 text-muted-foreground">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/30 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => jobId && toggleBookmark(jobId)}
                className="gap-2"
              >
                {jobId && isBookmarked(jobId) ? (
                  <>
                    <BookmarkCheck className="w-4 h-4" />
                    저장됨
                  </>
                ) : (
                  <>
                    <Bookmark className="w-4 h-4" />
                    스크랩
                  </>
                )}
              </Button>
              <div className="flex-1" />
              <Button
                onClick={handleApply}
                disabled={isExpired || !job.applyUrl}
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {isExpired ? '마감됨' : '지원하기'}
              </Button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
