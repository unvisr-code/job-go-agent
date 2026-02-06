'use client';

import { useEffect } from 'react';
import { X, TrendingUp, Calendar, History, Sparkles, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { JobPredictionExtended, PredictionEvidence, DutyCategory } from '@/types';
import Link from 'next/link';

interface PredictionEvidenceModalProps {
  prediction: JobPredictionExtended;
  onClose: () => void;
}

const MATCH_REASON_LABELS: Record<PredictionEvidence['matchReason'], string> = {
  same_month_last_year: '작년 동월',
  periodic_pattern: '동일 월',
  high_frequency: '과거 공고',
};

const MATCH_REASON_COLORS: Record<PredictionEvidence['matchReason'], string> = {
  same_month_last_year: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  periodic_pattern: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  high_frequency: 'bg-green-500/10 text-green-600 border-green-500/20',
};

const CONFIDENCE_LEVEL_LABELS = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const CONFIDENCE_LEVEL_COLORS = {
  high: 'text-green-500',
  medium: 'text-yellow-500',
  low: 'text-orange-500',
};

export function PredictionEvidenceModal({
  prediction,
  onClose,
}: PredictionEvidenceModalProps) {
  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const [year, monthStr] = prediction.predictedMonth.split('-');
  const monthNum = parseInt(monthStr);
  const confidencePercent = Math.round(prediction.confidence * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] sm:max-h-[80vh] overflow-hidden border border-border/50">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border/50 p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-lg leading-tight">
                예측 근거
              </h2>
              <p className="text-sm text-muted-foreground">
                {prediction.orgName}
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
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto max-h-[calc(85vh-180px)] sm:max-h-[calc(80vh-180px)]">
          {/* 예측 정보 */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="font-medium">예상 공고 시기</span>
              </div>
              <span className="text-lg font-bold text-primary">
                {year}년 {monthNum}월
              </span>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">신뢰도</span>
              <span className={`font-semibold ${CONFIDENCE_LEVEL_COLORS[prediction.confidenceLevel]}`}>
                {confidencePercent}% ({CONFIDENCE_LEVEL_LABELS[prediction.confidenceLevel]})
              </span>
            </div>
            <Progress value={confidencePercent} className="h-2" />
          </div>

          {/* 예측 기반 정보 */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-sm">분석 결과</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <span className="text-sm text-muted-foreground">과거 공고 수</span>
                <span className="font-medium">{prediction.basedOn.historicalCount}건</span>
              </div>
              {prediction.basedOn.lastYearSameMonth && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                  <span className="text-sm text-blue-600">작년 동월 공고</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600">
                    있음
                  </Badge>
                </div>
              )}
              {prediction.basedOn.periodicPattern && (
                <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
                  <span className="text-sm text-purple-600">채용 주기</span>
                  <Badge variant="secondary" className="bg-purple-500/10 text-purple-600">
                    {prediction.basedOn.periodicPattern}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* 근거 공고 목록 */}
          {prediction.evidenceJobs && prediction.evidenceJobs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-sm">근거 공고</h3>
              </div>
              <div className="space-y-2">
                {prediction.evidenceJobs.map((evidence, idx) => {
                  const [evidenceYear, evidenceMonth] = evidence.applyStartAt.split('-');
                  return (
                    <Link
                      key={`${evidence.jobId}-${idx}`}
                      href={`/jobs/${evidence.jobId}`}
                      className="block p-3 rounded-xl bg-muted/30 border border-border/50
                               hover:border-primary/30 hover:bg-muted/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                            {evidence.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {evidenceYear}년 {parseInt(evidenceMonth)}월
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border ${MATCH_REASON_COLORS[evidence.matchReason]}`}
                            >
                              {MATCH_REASON_LABELS[evidence.matchReason]}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* 안내 문구 */}
          <p className="text-xs text-muted-foreground text-center">
            * 예측은 과거 데이터 기반이며, 실제 공고 일정은 달라질 수 있습니다.
          </p>
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
