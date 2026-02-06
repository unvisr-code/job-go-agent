import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyStats } from '@/lib/supabase/stats-queries';
import { supabase } from '@/lib/supabase/client';
import type { StatsApiResponse, MonthlyStats } from '@/types';

/**
 * GET /api/stats/monthly
 * 월별 공고 수 통계 조회
 *
 * Query params:
 * - months: 조회할 개월 수 (기본 12, 최대 36)
 * - period: 'data' - DB 데이터 기간 기준 (2025-02 ~ 2026-02)
 */
export async function GET(request: NextRequest) {
  try {
    const period = request.nextUrl.searchParams.get('period');

    // DB 데이터 기간 기준 조회 (2025-02 ~ 2026-02)
    if (period === 'data') {
      const { data, error } = await supabase
        .from('job_postings')
        .select('apply_start_at, is_internship')
        .gte('apply_start_at', '2025-02-01')
        .lt('apply_start_at', '2026-03-01');

      if (error) {
        throw new Error('Failed to get monthly stats');
      }

      // 2025-02 ~ 2026-02 모든 월 초기화
      const monthlyMap = new Map<string, { count: number; internCount: number }>();
      for (let year = 2025; year <= 2026; year++) {
        const startMonth = year === 2025 ? 2 : 1;
        const endMonth = year === 2026 ? 2 : 12;
        for (let m = startMonth; m <= endMonth; m++) {
          const monthKey = `${year}-${String(m).padStart(2, '0')}`;
          monthlyMap.set(monthKey, { count: 0, internCount: 0 });
        }
      }

      for (const job of data || []) {
        if (!job.apply_start_at) continue;
        const date = new Date(job.apply_start_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const existing = monthlyMap.get(monthKey);
        if (existing) {
          existing.count++;
          if (job.is_internship) {
            existing.internCount++;
          }
        }
      }

      const result: MonthlyStats[] = [];
      for (const [month, stats] of monthlyMap.entries()) {
        result.push({
          month,
          count: stats.count,
          internCount: stats.internCount,
        });
      }

      const response: StatsApiResponse<MonthlyStats[]> = {
        success: true,
        data: result.sort((a, b) => a.month.localeCompare(b.month)),
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // 기존 로직: 최근 N개월
    const months = parseInt(
      request.nextUrl.searchParams.get('months') || '12'
    );

    const data = await getMonthlyStats(months);

    const response: StatsApiResponse<MonthlyStats[]> = {
      success: true,
      data,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Monthly stats error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
