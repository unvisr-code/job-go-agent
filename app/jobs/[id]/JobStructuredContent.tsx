'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  CheckCircle2,
  FileText,
  Star,
  Loader2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface StructuredData {
  duties: { category: string; items: string[] }[];
  requirements: { type: '필수' | '우대'; items: string[] }[];
  selectionSteps: { order: number; name: string; period?: string; method?: string }[];
  benefits: string[];
}

interface JobStructuredContentProps {
  jobId: string;
}

export function JobStructuredContent({ jobId }: JobStructuredContentProps) {
  const [data, setData] = useState<StructuredData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [structuredAt, setStructuredAt] = useState<string | null>(null);

  const fetchStructuredData = async (refresh = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = refresh
        ? `/api/jobs/${jobId}/structured?refresh=true`
        : `/api/jobs/${jobId}/structured`;
      const response = await fetch(url);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다.');
      }

      setData(result.data);
      setIsCached(result.cached || false);
      setStructuredAt(result.structuredAt || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStructuredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- jobId 변경 시에만 재실행
  }, [jobId]);

  const formatTime = (dateString: string) => {
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-muted-foreground">AI가 공고 정보를 정리 중...</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 py-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={() => fetchStructuredData()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              다시 시도
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasRequirements = data.requirements.some(r => r.items.length > 0);
  const hasDuties = data.duties.some(d => d.items.length > 0);
  const hasSteps = data.selectionSteps.length > 0;
  const hasBenefits = data.benefits.length > 0;

  return (
    <div className="space-y-4">
      {/* 구조화 시점 표시 */}
      {structuredAt && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{isCached ? `${formatTime(structuredAt)} 정리됨` : '방금 정리됨'}</span>
          {isCached && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => fetchStructuredData(true)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              다시 정리
            </Button>
          )}
        </div>
      )}

      {/* 직무 분야 */}
      {hasDuties && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="w-5 h-5 text-primary" />
              직무 분야
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.duties.map((duty, i) => (
              <div key={i}>
                {duty.category && (
                  <p className="text-sm font-medium text-foreground mb-2">{duty.category}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {duty.items.map((item, j) => (
                    <Badge key={j} variant="secondary" className="text-sm py-1.5 px-3">
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 지원 자격 */}
      {hasRequirements && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              지원 자격
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {data.requirements.map((req, i) => (
              <div key={i}>
                <div className="flex items-center gap-2 mb-3">
                  <Badge
                    variant={req.type === '필수' ? 'default' : 'outline'}
                    className={req.type === '필수'
                      ? 'bg-blue-500 hover:bg-blue-600'
                      : 'border-amber-400 text-amber-600'
                    }
                  >
                    {req.type}
                  </Badge>
                </div>
                <ul className="space-y-2.5">
                  {req.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-3">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium shrink-0 mt-0.5 ${
                        req.type === '필수'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {j + 1}
                      </span>
                      <span className="text-muted-foreground leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 전형 절차 */}
      {hasSteps && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              전형 절차
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 단계 플로우 */}
            <div className="flex flex-wrap items-center gap-2">
              {data.selectionSteps.map((step, i) => (
                <div key={i} className="flex items-center">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-sm">
                      {step.order}
                    </span>
                    <span className="font-medium">{step.name}</span>
                  </div>
                  {i < data.selectionSteps.length - 1 && (
                    <div className="mx-2 text-primary/50 font-bold">→</div>
                  )}
                </div>
              ))}
            </div>

            {/* 상세 일정 */}
            {data.selectionSteps.some(s => s.period || s.method) && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
                <p className="text-sm font-medium text-foreground">상세 일정</p>
                {data.selectionSteps.map((step, i) => (
                  (step.period || step.method) && (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                        {step.order}
                      </span>
                      <div>
                        <span className="font-medium">{step.name}</span>
                        {step.period && (
                          <span className="text-muted-foreground ml-2">({step.period})</span>
                        )}
                        {step.method && (
                          <p className="text-muted-foreground text-xs mt-0.5">{step.method}</p>
                        )}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 우대사항/복리후생 */}
      {hasBenefits && (
        <Card className="border-amber-200/50 bg-amber-50/30 dark:bg-amber-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-amber-500" />
              우대사항 및 복리후생
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.benefits.map((benefit, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{benefit}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
