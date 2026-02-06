import { NextRequest, NextResponse } from 'next/server';
import { searchJobs } from '@/lib/supabase/queries';
import {
  JobSearchQuerySchema,
  parseSearchParams,
  formatZodError,
} from '@/lib/validation';

/**
 * GET /api/jobs
 * 채용공고 검색 API
 *
 * Query params:
 * - query: 검색어 (제목, 기관명, 직무내용, 최대 100자)
 * - employmentType: INTERN, CONTRACT, REGULAR, OTHER (복수 가능)
 * - regions: 지역 (복수 가능)
 * - dutyCategories: 직무분류 (복수 가능)
 * - isInternship: true/false
 * - applyEndAfter: ISO date string (마감일 필터)
 * - sortBy: deadline, recent, relevance
 * - page: 페이지 번호 (1부터, 최대 1000)
 * - limit: 페이지당 개수 (기본 20, 최대 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Parse query parameters (handling arrays)
    const rawParams = parseSearchParams(searchParams, [
      'employmentType',
      'regions',
      'dutyCategories',
    ]);

    // Handle isInternship boolean conversion
    const isInternshipStr = rawParams.isInternship as string | undefined;
    const paramsToValidate = {
      ...rawParams,
      isInternship: isInternshipStr !== undefined ? isInternshipStr === 'true' : undefined,
    };

    // Validate with Zod
    const parseResult = JobSearchQuerySchema.safeParse(paramsToValidate);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const params = parseResult.data;

    // Clean up empty arrays
    const searchParams2 = {
      query: params.query,
      employmentType:
        params.employmentType && params.employmentType.length > 0
          ? params.employmentType
          : undefined,
      regions:
        params.regions && params.regions.length > 0 ? params.regions : undefined,
      dutyCategories:
        params.dutyCategories && params.dutyCategories.length > 0
          ? params.dutyCategories
          : undefined,
      isInternship: params.isInternship,
      applyEndAfter: params.applyEndAfter,
      sortBy: params.sortBy,
      page: params.page,
      limit: params.limit,
    };

    const { jobs, total } = await searchJobs(searchParams2);

    const page = params.page;
    const limit = params.limit;
    const hasMore = page * limit < total;

    return NextResponse.json({
      jobs,
      total,
      page,
      limit,
      hasMore,
    });
  } catch (error) {
    console.error('[API] /api/jobs error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
