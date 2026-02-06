import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationPatterns, searchOrganizationPatterns } from '@/lib/supabase/stats-queries';
import type { StatsApiResponse, OrganizationPattern, OrganizationSearchResponse } from '@/types';

/**
 * GET /api/stats/organizations
 * 기관별 채용 패턴 조회
 *
 * Query params:
 * - limit: 조회할 기관 수 (기본 20, 최대 100)
 * - query: 기관명 검색어 (선택)
 * - page: 페이지 번호 (기본 1)
 * - extended: 'true' - 상세 데이터 포함 (historicalJobs)
 */
export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(
      request.nextUrl.searchParams.get('limit') || '20'
    );
    const query = request.nextUrl.searchParams.get('query') || undefined;
    const page = parseInt(
      request.nextUrl.searchParams.get('page') || '1'
    );
    const extended = request.nextUrl.searchParams.get('extended') === 'true';

    // 검색 또는 상세 데이터 요청
    if (query || extended) {
      const result = await searchOrganizationPatterns({
        query,
        page,
        limit,
      });

      const response: StatsApiResponse<OrganizationSearchResponse> = {
        success: true,
        data: result,
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // 기존 로직: 단순 조회
    const data = await getOrganizationPatterns(limit);

    const response: StatsApiResponse<OrganizationPattern[]> = {
      success: true,
      data,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Organization patterns error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
