import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/supabase/queries';
import { getCachedAnalysis, saveAnalysis } from '@/lib/supabase/analysis-queries';
import { isOpenAIConfigured, openai, CHAT_MODEL } from '@/lib/openai/client';

/**
 * GET /api/jobs/[id]/analysis
 * LLM을 사용한 채용공고 종합 분석 (캐싱 지원)
 *
 * Query params:
 * - refresh=true: 캐시 무시하고 재분석
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // 캐시 확인 (refresh가 아닌 경우)
    if (!refresh) {
      const cached = await getCachedAnalysis(id);
      if (cached) {
        return NextResponse.json({
          analysis: {
            summary: cached.summary,
            highlights: cached.highlights,
            concerns: cached.concerns,
            tip: cached.tip,
            matchScore: cached.matchScore,
          },
          cached: true,
          analyzedAt: cached.createdAt,
        });
      }
    }

    // OpenAI 설정 확인
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'AI 서비스가 설정되지 않았습니다.' },
        { status: 503 }
      );
    }

    // 공고 조회
    const job = await getJobById(id);
    if (!job) {
      return NextResponse.json(
        { error: '공고를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // LLM 프롬프트 구성
    const jobContext = `
기관명: ${job.orgName}
공고제목: ${job.title}
채용유형: ${job.employmentType}
근무지역: ${job.regions.join(', ') || '미정'}
모집인원: ${job.headcountText || '미정'}
접수기간: ${job.applyStartAt ? new Date(job.applyStartAt).toLocaleDateString('ko-KR') : '미정'} ~ ${job.applyEndAt ? new Date(job.applyEndAt).toLocaleDateString('ko-KR') : '상시'}
직무내용: ${job.dutiesText || '정보 없음'}
지원자격: ${job.requirements.length > 0 ? job.requirements.join('\n') : '정보 없음'}
전형절차: ${job.selectionSteps?.map(s => `${s.order}. ${s.name}`).join(' → ') || '정보 없음'}
`.trim();

    const response = await openai!.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 취업 전문 상담사입니다. 효주님(대학생, 인턴 취업 준비 중)을 위해 채용공고를 분석해주세요.

응답 형식 (JSON):
{
  "summary": "공고 한줄 요약 (30자 이내)",
  "highlights": ["장점1", "장점2", "장점3"],
  "concerns": ["주의사항1", "주의사항2"],
  "tip": "지원 팁 한 문장",
  "matchScore": 1-5 (효주님에게 적합도, 서울/경기 인턴 기준)
}

간결하고 실용적인 정보만 제공하세요.`
        },
        {
          role: 'user',
          content: `다음 채용공고를 분석해주세요:\n\n${jobContext}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM 응답이 없습니다.');
    }

    const analysis = JSON.parse(content);

    // 분석 결과 캐싱
    const saved = await saveAnalysis(id, analysis);
    const analyzedAt = saved?.createdAt || new Date().toISOString();

    return NextResponse.json({
      analysis,
      cached: false,
      analyzedAt,
    });
  } catch (error) {
    console.error('[API] Job analysis error:', error);

    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { error: 'AI 서비스 사용량이 초과되었습니다.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '분석 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
