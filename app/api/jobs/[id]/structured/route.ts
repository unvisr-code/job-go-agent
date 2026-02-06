import { NextRequest, NextResponse } from 'next/server';
import { getJobById } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import { isOpenAIConfigured, openai, CHAT_MODEL } from '@/lib/openai/client';

interface StructuredJobData {
  duties: { category: string; items: string[] }[];
  requirements: { type: '필수' | '우대'; items: string[] }[];
  selectionSteps: { order: number; name: string; period?: string; method?: string }[];
  benefits: string[];
}

/**
 * GET /api/jobs/[id]/structured
 * LLM을 사용해 채용공고 텍스트를 구조화 (캐싱 지원)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const refresh = request.nextUrl.searchParams.get('refresh') === 'true';

    // 캐시 확인
    if (!refresh) {
      const { data: cached } = await supabase
        .from('job_structured_data')
        .select('*')
        .eq('job_id', id)
        .single();

      if (cached) {
        return NextResponse.json({
          data: {
            duties: cached.duties || [],
            requirements: cached.requirements || [],
            selectionSteps: cached.selection_steps || [],
            benefits: cached.benefits || [],
          },
          cached: true,
          structuredAt: cached.created_at,
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

    // 원본 텍스트 준비
    const rawData = `
[직무내용]
${job.dutiesText || '정보 없음'}

[지원자격]
${job.requirements.join('\n') || '정보 없음'}

[전형절차]
${job.selectionSteps?.map(s => `${s.order}. ${s.name}: ${s.description || ''}`).join('\n') || '정보 없음'}

[지원방법/기타]
${job.applyMethod || '정보 없음'}
`.trim();

    // LLM으로 구조화
    const response = await openai!.chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content: `당신은 채용공고 텍스트를 깔끔하게 구조화하는 전문가입니다.
주어진 텍스트에서 정보를 추출하여 JSON 형식으로 정리해주세요.

응답 형식:
{
  "duties": [
    {"category": "분야명", "items": ["업무1", "업무2"]}
  ],
  "requirements": [
    {"type": "필수", "items": ["자격1", "자격2"]},
    {"type": "우대", "items": ["우대1", "우대2"]}
  ],
  "selectionSteps": [
    {"order": 1, "name": "서류전형", "period": "2.13~2.16", "method": "온라인 제출"}
  ],
  "benefits": ["복리후생1", "우대사항1"]
}

규칙:
1. 불완전한 문장은 완성하여 작성
2. 중복 제거
3. 각 항목은 간결하고 명확하게 (한 문장)
4. 날짜는 "M.D" 형식으로 통일
5. 정보가 없으면 빈 배열 []
6. "필수자격요건", "공통자격요건" 등의 헤더는 제외하고 실제 내용만`
        },
        {
          role: 'user',
          content: `다음 채용공고 텍스트를 구조화해주세요:\n\n${rawData}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('LLM 응답이 없습니다.');
    }

    const structured: StructuredJobData = JSON.parse(content);

    // DB에 캐싱
    const { data: saved } = await supabase
      .from('job_structured_data')
      .upsert({
        job_id: id,
        duties: structured.duties || [],
        requirements: structured.requirements || [],
        selection_steps: structured.selectionSteps || [],
        benefits: structured.benefits || [],
      }, { onConflict: 'job_id' })
      .select()
      .single();

    return NextResponse.json({
      data: structured,
      cached: false,
      structuredAt: saved?.created_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Job structured data error:', error);

    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { error: 'AI 서비스 사용량이 초과되었습니다.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '데이터 구조화 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
