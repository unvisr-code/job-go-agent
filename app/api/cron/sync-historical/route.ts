import { NextRequest, NextResponse } from 'next/server';
import { fetchAllHistoricalJobs } from '@/lib/publicdata/client';
import { normalizeJobItems } from '@/lib/publicdata/normalizer';
import { upsertJobs } from '@/lib/supabase/queries';

/**
 * Historical ETL
 * 종료된 과거 공고 대량 수집 (예측/통계용)
 *
 * 수동 실행 전용 (CRON_SECRET 필요)
 */

export const maxDuration = 300; // 5분 타임아웃 (대량 데이터)

export async function GET(request: NextRequest) {
  // Bearer 토큰 확인
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get('authorization');

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 페이지 수 파라미터 (기본 100페이지 = 최대 10,000건)
  const maxPages = Math.min(
    parseInt(request.nextUrl.searchParams.get('maxPages') || '100'),
    200 // 안전 제한
  );

  console.log(`[Historical ETL] Starting... (maxPages: ${maxPages})`);
  const startTime = Date.now();

  try {
    // 1. 종료된 공고 대량 수집
    const rawItems = await fetchAllHistoricalJobs(maxPages);

    if (rawItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No historical jobs fetched',
        stats: { fetched: 0, upserted: 0, duration: Date.now() - startTime },
      });
    }

    console.log(`[Historical ETL] Fetched ${rawItems.length} historical jobs`);

    // 2. 데이터 정규화
    const normalizedJobs = normalizeJobItems(rawItems);

    console.log(`[Historical ETL] Normalized ${normalizedJobs.length} jobs`);

    // 3. 배치로 나누어 Supabase에 저장 (대용량 처리)
    const BATCH_SIZE = 500;
    let totalUpserted = 0;

    for (let i = 0; i < normalizedJobs.length; i += BATCH_SIZE) {
      const batch = normalizedJobs.slice(i, i + BATCH_SIZE);
      const upsertedCount = await upsertJobs(batch);
      totalUpserted += upsertedCount;

      console.log(`[Historical ETL] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${upsertedCount} jobs`);
    }

    const duration = Date.now() - startTime;
    console.log(`[Historical ETL] Completed in ${duration}ms. Total upserted: ${totalUpserted}`);

    return NextResponse.json({
      success: true,
      message: 'Historical sync completed',
      stats: {
        fetched: rawItems.length,
        upserted: totalUpserted,
        duration,
        maxPages,
      },
    });
  } catch (error) {
    console.error('[Historical ETL] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
