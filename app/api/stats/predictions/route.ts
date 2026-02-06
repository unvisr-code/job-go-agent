import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalDataForPredictions } from '@/lib/supabase/stats-queries';
import { generatePredictions, generatePredictionsExtended } from '@/lib/predictions/engine';
import type { PredictionsApiResponse, JobPredictionExtended } from '@/types';

interface PredictionsExtendedApiResponse {
  success: boolean;
  predictions: JobPredictionExtended[];
  generatedAt: string;
}

/**
 * GET /api/stats/predictions
 * 예측 공고 목록 조회
 *
 * Query params:
 * - extended: 'true' - 근거(evidence) 포함 상세 예측
 * - months: 향후 예측 개월 수 (기본 3, 최대 12)
 */
export async function GET(request: NextRequest) {
  try {
    const extended = request.nextUrl.searchParams.get('extended') === 'true';
    const months = Math.min(
      parseInt(request.nextUrl.searchParams.get('months') || '10'),
      12
    );

    // 과거 데이터 조회
    const historicalData = await getHistoricalDataForPredictions();

    if (extended) {
      // 근거 포함 상세 예측
      const predictions = generatePredictionsExtended(historicalData);

      // 신뢰도 상위 100개
      const topPredictions = predictions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 100);

      const response: PredictionsExtendedApiResponse = {
        success: true,
        predictions: topPredictions,
        generatedAt: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // 기존 로직: 단순 예측
    const predictions = generatePredictions(historicalData, months);

    // 신뢰도 상위 50개만 반환
    const topPredictions = predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50);

    const response: PredictionsApiResponse = {
      success: true,
      predictions: topPredictions,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Predictions error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
