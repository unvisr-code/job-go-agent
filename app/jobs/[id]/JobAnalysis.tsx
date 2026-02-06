'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  Loader2,
  RefreshCw,
  Star,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface JobAnalysisData {
  summary: string;
  highlights: string[];
  concerns: string[];
  tip: string;
  matchScore: number;
}

interface JobAnalysisProps {
  jobId: string;
}

export function JobAnalysis({ jobId }: JobAnalysisProps) {
  const [analysis, setAnalysis] = useState<JobAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(null);

  const fetchAnalysis = async (refresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = refresh
        ? `/api/jobs/${jobId}/analysis?refresh=true`
        : `/api/jobs/${jobId}/analysis`;
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '분석에 실패했습니다.');
      }

      setAnalysis(data.analysis);
      setIsCached(data.cached || false);
      setAnalyzedAt(data.analyzedAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobId 변경 시에만 재실행
  }, [jobId]);

  const formatAnalyzedTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return '';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
            <span className="text-muted-foreground">AI가 공고를 분석 중...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchAnalysis()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-violet-600" />
            AI 종합 평가
          </div>
          <div className="flex items-center gap-3">
            {/* 별점 */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= analysis.matchScore
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </CardTitle>

        {/* 분석 시점 표시 */}
        {analyzedAt && (
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {isCached ? (
                  <>
                    {formatAnalyzedTime(analyzedAt)} 분석됨
                  </>
                ) : (
                  '방금 분석됨'
                )}
              </span>
            </div>
            {isCached && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => fetchAnalysis(true)}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                다시 분석
              </Button>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 요약 */}
        <div className="p-3 bg-white/60 dark:bg-black/20 rounded-lg">
          <p className="font-medium text-foreground">{analysis.summary}</p>
        </div>

        {/* 장점 */}
        {analysis.highlights.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-green-700 dark:text-green-400">
              <ThumbsUp className="w-4 h-4" />
              이런 점이 좋아요
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.highlights.map((highlight, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                >
                  {highlight}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 주의사항 */}
        {analysis.concerns.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              확인하세요
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.concerns.map((concern, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                >
                  {concern}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 지원 팁 */}
        {analysis.tip && (
          <div className="flex items-start gap-2 p-3 bg-violet-100/50 dark:bg-violet-900/20 rounded-lg">
            <Lightbulb className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
            <p className="text-sm text-violet-800 dark:text-violet-300">
              <span className="font-medium">효주님 팁:</span> {analysis.tip}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
