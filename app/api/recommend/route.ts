import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedJobs } from '@/lib/supabase/queries';
import {
  RecommendQuerySchema,
  parseSearchParams,
  formatZodError,
} from '@/lib/validation';

/**
 * GET /api/recommend
 * 채용공고 추천 API
 *
 * Query params:
 * - regions: 선호 지역 (복수 가능)
 * - dutyCategories: 선호 직무분류 (복수 가능)
 * - employmentTypes: 선호 고용형태 (복수 가능)
 * - limit: 최대 추천 수 (기본 10, 최대 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse query parameters (handling arrays)
    const rawParams = parseSearchParams(searchParams, [
      'regions',
      'dutyCategories',
      'employmentTypes',
    ]);

    // Validate with Zod
    const parseResult = RecommendQuerySchema.safeParse(rawParams);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const params = parseResult.data;

    const jobs = await getRecommendedJobs({
      regions:
        params.regions && params.regions.length > 0 ? params.regions : undefined,
      dutyCategories:
        params.dutyCategories && params.dutyCategories.length > 0
          ? params.dutyCategories
          : undefined,
      employmentTypes:
        params.employmentTypes && params.employmentTypes.length > 0
          ? params.employmentTypes
          : undefined,
      limit: params.limit,
    });

    // 간단한 점수 계산 (규칙 기반)
    const recommendations = jobs.map((job) => {
      let score = 50; // 기본 점수
      const reasons: string[] = [];

      // 마감일이 가까울수록 높은 점수
      if (job.applyEndAt) {
        const daysLeft = Math.ceil(
          (new Date(job.applyEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysLeft <= 7) {
          score += 20;
          reasons.push('마감 임박');
        } else if (daysLeft <= 14) {
          score += 10;
        }
      }

      // 인턴십은 약간 높은 점수 (신입 지원자 관점)
      if (job.isInternship) {
        score += 10;
        reasons.push('인턴십 기회');
      }

      // 선호 지역 매칭
      if (
        params.regions &&
        params.regions.length > 0 &&
        job.regions.some((r) => params.regions!.includes(r))
      ) {
        score += 15;
        reasons.push('선호 지역');
      }

      // 선호 직무 매칭
      if (
        params.dutyCategories &&
        params.dutyCategories.length > 0 &&
        job.dutyCategories.some((c) => params.dutyCategories!.includes(c))
      ) {
        score += 15;
        reasons.push('선호 직무');
      }

      return {
        job,
        score: Math.min(score, 100),
        reasons,
      };
    });

    // 점수순 정렬
    recommendations.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      recommendations,
    });
  } catch (error) {
    console.error('[API] /api/recommend error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
