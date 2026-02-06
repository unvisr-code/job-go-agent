'use client';

import { useState } from 'react';
import { TrendingUp, AlertCircle, Sparkles, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { JobPrediction, JobPredictionExtended, DutyCategory } from '@/types';

interface PredictionListProps {
  predictions: (JobPrediction | JobPredictionExtended)[];
  onPredictionClick?: (prediction: JobPrediction | JobPredictionExtended) => void;
  initialCollapsed?: boolean;
}

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

export function PredictionList({ predictions, onPredictionClick, initialCollapsed = true }: PredictionListProps) {
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const INITIAL_SHOW_COUNT = 3;

  // 월별로 그룹화
  const groupedByMonth = predictions.reduce(
    (acc, pred) => {
      if (!acc[pred.predictedMonth]) {
        acc[pred.predictedMonth] = [];
      }
      acc[pred.predictedMonth].push(pred);
      return acc;
    },
    {} as Record<string, JobPrediction[]>
  );

  const months = Object.keys(groupedByMonth).sort();

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };

  if (predictions.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">
          예측할 수 있는 데이터가 충분하지 않습니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {months.map((month) => {
        const [year, monthNum] = month.split('-');
        const monthLabel = `${year}년 ${parseInt(monthNum)}월`;
        const allMonthPredictions = groupedByMonth[month]
          .sort((a, b) => b.confidence - a.confidence);

        const isExpanded = expandedMonths[month] ?? !initialCollapsed;
        const visiblePredictions = isExpanded
          ? allMonthPredictions
          : allMonthPredictions.slice(0, INITIAL_SHOW_COUNT);
        const hasMore = allMonthPredictions.length > INITIAL_SHOW_COUNT;

        return (
          <div key={month}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">{monthLabel} 예상</h3>
              <Badge variant="outline" className="text-xs">
                {allMonthPredictions.length}개 기관
              </Badge>
            </div>

            <div className="space-y-2">
              {visiblePredictions.map((pred, index) => (
                <PredictionItem
                  key={`${pred.orgName}-${index}`}
                  prediction={pred}
                  onClick={onPredictionClick ? () => onPredictionClick(pred) : undefined}
                />
              ))}
            </div>

            {hasMore && (
              <button
                onClick={() => toggleMonth(month)}
                className="w-full mt-2 py-2 rounded-lg border border-border/50
                         hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5 text-xs text-muted-foreground"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {allMonthPredictions.length - INITIAL_SHOW_COUNT}개 더보기
                  </>
                )}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PredictionItem({
  prediction,
  onClick,
}: {
  prediction: JobPrediction | JobPredictionExtended;
  onClick?: () => void;
}) {
  const confidencePercent = Math.round(prediction.confidence * 100);
  const confidenceColor =
    confidencePercent >= 80
      ? 'text-green-500'
      : confidencePercent >= 60
        ? 'text-yellow-500'
        : 'text-orange-500';

  // 확장된 예측인지 확인
  const extendedPrediction = 'confidenceLevel' in prediction ? prediction as JobPredictionExtended : null;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm line-clamp-1">{prediction.orgName}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {prediction.basedOn.lastYearSameMonth && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              작년 동월
            </Badge>
          )}
          {prediction.basedOn.periodicPattern && (
            <Badge variant="secondary" className="text-[10px] px-1.5">
              {prediction.basedOn.periodicPattern}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground">
            과거 {prediction.basedOn.historicalCount}건 기반
          </span>
        </div>
        {/* 예상 직무 표시 (확장된 예측인 경우) */}
        {extendedPrediction?.predictedDutyCategories && extendedPrediction.predictedDutyCategories.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {extendedPrediction.predictedDutyCategories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary"
              >
                {DUTY_CATEGORY_LABELS[cat]}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex flex-col items-end gap-1 w-16">
          <span className={`text-sm font-semibold ${confidenceColor}`}>
            {confidencePercent}%
          </span>
          <Progress value={confidencePercent} className="h-1.5 w-full" />
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

export function PredictionListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((month) => (
        <div key={month}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="h-5 bg-muted rounded w-32 animate-pulse" />
          </div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 animate-pulse"
              >
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
                <div className="w-16 h-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
