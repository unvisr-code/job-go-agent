'use client';

import { useEffect } from 'react';
import { X, Building2, Calendar, Clock, Briefcase, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { OrganizationPatternExtended, DutyCategory } from '@/types';
import Link from 'next/link';

interface OrganizationDetailModalProps {
  pattern: OrganizationPatternExtended;
  onClose: () => void;
}

const MONTH_NAMES = ['', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const DUTY_CATEGORY_LABELS: Record<DutyCategory, string> = {
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

const DUTY_CATEGORY_COLORS: Record<DutyCategory, string> = {
  DATA: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DEVELOPMENT: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  MARKETING: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  DESIGN: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  HR: 'bg-green-500/10 text-green-600 border-green-500/20',
  FINANCE: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  ADMINISTRATION: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  RESEARCH: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  OTHER: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function OrganizationDetailModal({
  pattern,
  onClose,
}: OrganizationDetailModalProps) {
  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const lastPostedDate = pattern.lastPostedAt
    ? new Date(pattern.lastPostedAt)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] sm:max-h-[80vh] overflow-hidden border border-border/50">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border/50 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight line-clamp-1">
                {pattern.orgName}
              </h2>
              <p className="text-sm text-muted-foreground">
                총 {pattern.totalJobs}건
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-muted/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto max-h-[calc(85vh-140px)] sm:max-h-[calc(80vh-140px)] space-y-5">
          {/* 주요 채용 시기 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">주요 채용 시기</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pattern.typicalMonths.map((month) => (
                <Badge
                  key={month}
                  variant="secondary"
                  className="px-3 py-1"
                >
                  {MONTH_NAMES[month]}
                </Badge>
              ))}
            </div>
          </div>

          {/* 마지막 공고 정보 */}
          {lastPostedDate && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">최근 채용</h3>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <p className="text-sm text-muted-foreground">
                  {lastPostedDate.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {pattern.mostRecentTitle && (
                  <p className="text-sm mt-1 line-clamp-2">{pattern.mostRecentTitle}</p>
                )}
              </div>
            </div>
          )}

          {/* 과거 공고 목록 */}
          {pattern.historicalJobs && pattern.historicalJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Briefcase className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">
                  과거 공고 ({pattern.historicalJobs.length}건)
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {pattern.historicalJobs.map((job) => {
                  const startDate = new Date(job.applyStartAt);
                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block p-3 rounded-xl bg-muted/30 border border-border/50
                               hover:border-primary/30 hover:bg-muted/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                            {job.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {startDate.toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                      {job.dutyCategories && job.dutyCategories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.dutyCategories.slice(0, 3).map((cat) => (
                            <span
                              key={cat}
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${DUTY_CATEGORY_COLORS[cat]}`}
                            >
                              {DUTY_CATEGORY_LABELS[cat]}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-background border-t border-border/50 p-4 sm:p-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 min-h-[44px] rounded-xl bg-primary text-primary-foreground font-medium
                       hover:bg-primary/90 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
