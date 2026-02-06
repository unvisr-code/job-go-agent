import { NextRequest, NextResponse } from 'next/server';
import { getOpenAIClient, isOpenAIConfigured } from '@/lib/openai/client';
import type { MonthlyStats, OrganizationPattern, JobPrediction, AIAnalysisResult } from '@/types';

/**
 * POST /api/stats/ai-analysis
 * AI를 활용한 채용 트렌드 분석
 */

const SYSTEM_PROMPT = `당신은 공공기관 채용 전문 분석가입니다.
효주님(인턴 취준생)을 위해 채용 데이터를 분석하고 인사이트를 제공합니다.

분석 시 고려할 사항:
- 인턴 채용 트렌드와 시기
- 주요 채용 기관의 패턴
- 예측된 공고에 대한 준비 전략
- 실용적이고 구체적인 조언

응답은 반드시 아래 JSON 형식으로:
{
  "summary": "전체 상황 요약 (2-3문장)",
  "insights": ["인사이트1", "인사이트2", "인사이트3"],
  "recommendations": ["추천1", "추천2", "추천3"]
}`;

interface AnalysisRequest {
  monthlyStats: MonthlyStats[];
  patterns: OrganizationPattern[];
  predictions: JobPrediction[];
}

export async function POST(request: NextRequest) {
  if (!isOpenAIConfigured()) {
    return NextResponse.json(
      { success: false, error: 'AI 서비스가 설정되지 않았습니다' },
      { status: 503 }
    );
  }

  try {
    const body: AnalysisRequest = await request.json();
    const { monthlyStats, patterns, predictions } = body;

    // 분석용 데이터 정리
    const recentStats = monthlyStats.slice(-6);
    const totalRecentJobs = recentStats.reduce((sum, s) => sum + s.count, 0);
    const totalRecentInterns = recentStats.reduce((sum, s) => sum + s.internCount, 0);

    const topPatterns = patterns.slice(0, 5);
    const highConfidencePredictions = predictions
      .filter(p => p.confidence >= 0.6)
      .slice(0, 10);

    const userPrompt = `
## 최근 6개월 채용 현황
- 전체 공고: ${totalRecentJobs}건
- 인턴 공고: ${totalRecentInterns}건 (${Math.round((totalRecentInterns / totalRecentJobs) * 100)}%)

## 월별 추이
${recentStats.map(s => `- ${s.month}: 전체 ${s.count}건, 인턴 ${s.internCount}건`).join('\n')}

## 주요 채용 기관 (상위 5개)
${topPatterns.map(p => `- ${p.orgName}: 총 ${p.totalJobs}건, 주로 ${p.typicalMonths.map(m => `${m}월`).join(', ')} 채용`).join('\n')}

## 예측 공고 (신뢰도 60% 이상)
${highConfidencePredictions.map(p => `- ${p.orgName}: ${p.predictedMonth} 예상 (신뢰도 ${Math.round(p.confidence * 100)}%)`).join('\n')}

위 데이터를 바탕으로 효주님에게 유용한 분석과 조언을 제공해주세요.
`;

    const openai = getOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다');
    }

    const analysis: AIAnalysisResult = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      analysis,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] AI Analysis error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
