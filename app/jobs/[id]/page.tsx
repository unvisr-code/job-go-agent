import { notFound } from 'next/navigation';
import { getJobById } from '@/lib/supabase/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  MapPin,
  Calendar,
  Users,
  ArrowLeft,
  Clock,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { format, differenceInDays, isPast } from 'date-fns';
import { ko } from 'date-fns/locale';
import { JobDetailActions } from './JobDetailActions';
import { JobAnalysis } from './JobAnalysis';
import { JobStructuredContent } from './JobStructuredContent';

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

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    return { title: '공고를 찾을 수 없습니다 - 공채GO' };
  }

  return {
    title: `${job.title} - ${job.orgName} | 공채GO`,
    description: job.dutiesText || `${job.orgName}의 채용공고입니다.`,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) {
    notFound();
  }

  const daysUntilDeadline = job.applyEndAt
    ? differenceInDays(new Date(job.applyEndAt), new Date())
    : null;

  const isExpired = job.applyEndAt ? isPast(new Date(job.applyEndAt)) : false;
  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 7 && !isExpired;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Back button */}
      <Link href="/">
        <Button variant="ghost" className="mb-4 gap-2 min-h-[44px]">
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Button>
      </Link>

      <div className="space-y-6">
        {/* Header Card - 공고 기본 정보 */}
        <Card className="overflow-hidden border-0 shadow-lg">
          {/* 마감 임박 배너 */}
          {isUrgent && (
            <div className="bg-destructive text-destructive-foreground px-4 py-2 text-center text-sm font-medium">
              마감까지 {daysUntilDeadline === 0 ? '오늘' : `D-${daysUntilDeadline}`} 남았습니다
            </div>
          )}
          {isExpired && (
            <div className="bg-muted text-muted-foreground px-4 py-2 text-center text-sm font-medium">
              이 공고는 마감되었습니다
            </div>
          )}

          <CardContent className="p-6 md:p-8">
            {/* 기관 정보 */}
            <div className="flex items-start gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-sm mb-1">{job.orgName}</p>
                <h1 className="text-xl md:text-2xl font-bold leading-tight break-keep">
                  {job.title}
                </h1>
              </div>
            </div>

            {/* 태그 */}
            <div className="flex flex-wrap gap-2 mb-6">
              <Badge
                variant="default"
                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
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

            {/* 핵심 정보 그리드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-xl mb-6">
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
                    <Clock className="w-4 h-4 text-primary" />
                    <span className={`font-medium text-sm ${isUrgent ? 'text-destructive' : ''}`}>
                      {daysUntilDeadline === 0 ? '오늘 마감' : `D-${daysUntilDeadline}`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            <JobDetailActions
              jobId={job.id}
              applyUrl={job.applyUrl}
              sourceUrl={job.sourceUrl}
              isExpired={isExpired}
            />
          </CardContent>
        </Card>

        {/* AI 종합 평가 */}
        <JobAnalysis jobId={job.id} />

        {/* LLM으로 구조화된 상세 정보 */}
        <JobStructuredContent jobId={job.id} />

        {/* 유의사항 */}
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                  효주님께 알려드려요
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  정확한 지원 자격과 제출 서류는 반드시 원문 공고를 확인해주세요.
                  공채GO는 정보 제공 목적이며, 실제 채용 정보와 다를 수 있습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 메타 정보 */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>공고번호: {job.sourceId}</span>
              {job.sourceUpdatedAt && (
                <span>
                  원문 업데이트: {format(new Date(job.sourceUpdatedAt), 'yyyy.M.d', { locale: ko })}
                </span>
              )}
              <span>
                수집일: {format(new Date(job.createdAt), 'yyyy.M.d', { locale: ko })}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
