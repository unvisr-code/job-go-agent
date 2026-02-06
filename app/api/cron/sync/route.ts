import { NextRequest, NextResponse } from 'next/server';
import { fetchAllPublicJobs } from '@/lib/publicdata/client';
import { normalizeJobItems } from '@/lib/publicdata/normalizer';
import { upsertJobs } from '@/lib/supabase/queries';

/**
 * ETL Cron Job
 * 공공데이터포털에서 채용공고를 가져와 Supabase에 저장
 *
 * Vercel Cron: 30분마다 실행
 * 수동 실행: POST /api/cron/sync (CRON_SECRET 필요)
 */

export const maxDuration = 60; // 60초 타임아웃

export async function GET(request: NextRequest) {
  return handleSync(request);
}

export async function POST(request: NextRequest) {
  return handleSync(request);
}

async function handleSync(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // CRON_SECRET must be configured in production
  if (!cronSecret) {
    console.error('[ETL] CRON_SECRET is not configured');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  // Authentication via Authorization header only (not query params to avoid URL logging)
  const authHeader = request.headers.get('authorization');
  const isAuthorized = authHeader === `Bearer ${cronSecret}`;

  if (!isAuthorized) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('[ETL] Starting sync...');
  const startTime = Date.now();

  try {
    // 1. 공공데이터포털에서 데이터 가져오기
    const rawItems = await fetchAllPublicJobs(10); // 최대 10페이지 (1000개)

    if (rawItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No jobs fetched from API',
        stats: { fetched: 0, upserted: 0, duration: Date.now() - startTime },
      });
    }

    console.log(`[ETL] Fetched ${rawItems.length} jobs`);

    // 2. 데이터 정규화
    const normalizedJobs = normalizeJobItems(rawItems);

    console.log(`[ETL] Normalized ${normalizedJobs.length} jobs`);

    // 3. Supabase에 저장 (upsert)
    const upsertedCount = await upsertJobs(normalizedJobs);

    const duration = Date.now() - startTime;
    console.log(`[ETL] Completed in ${duration}ms. Upserted: ${upsertedCount}`);

    return NextResponse.json({
      success: true,
      message: 'Sync completed',
      stats: {
        fetched: rawItems.length,
        upserted: upsertedCount,
        duration,
      },
    });
  } catch (error) {
    console.error('[ETL] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
