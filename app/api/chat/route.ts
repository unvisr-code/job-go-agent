import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/lib/openai/agent';
import { ChatRequestSchema, formatZodError } from '@/lib/validation';
import { isOpenAIConfigured } from '@/lib/openai/client';
import { addChatMessage, getChatMessages } from '@/lib/supabase/chat-queries';

/**
 * POST /api/chat
 * 대화형 채용공고 탐색 API
 *
 * Body:
 * - message: string (사용자 메시지, 1-2000자)
 * - sessionId?: string (세션 ID - DB 저장용)
 * - history: AgentMessage[] (대화 히스토리, 선택, 최대 50개)
 */
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!isOpenAIConfigured()) {
      return NextResponse.json(
        { error: 'AI service is not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod
    const parseResult = ChatRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: formatZodError(parseResult.error) },
        { status: 400 }
      );
    }

    const { message, sessionId } = parseResult.data;
    let { history } = parseResult.data;

    // sessionId가 있으면 DB에서 히스토리 로드
    if (sessionId && (!history || history.length === 0)) {
      try {
        const dbMessages = await getChatMessages(sessionId);
        history = dbMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      } catch {
        // DB 에러 무시 - 히스토리 없이 진행
      }
    }

    // 세션이 있으면 사용자 메시지 저장
    if (sessionId) {
      try {
        await addChatMessage(sessionId, 'user', message);
      } catch {
        // DB 에러 무시
      }
    }

    // Agent 실행
    const response = await runAgent(message, history);

    // 세션이 있으면 어시스턴트 응답 저장
    if (sessionId) {
      try {
        await addChatMessage(sessionId, 'assistant', response);
      } catch {
        // DB 에러 무시
      }
    }

    return NextResponse.json({
      message: response,
    });
  } catch (error) {
    console.error('[API] /api/chat error:', error);

    // OpenAI API 에러 처리
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'AI 서비스 인증에 실패했습니다.' },
          { status: 503 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }
      if (error.message.includes('quota') || error.message.includes('429')) {
        return NextResponse.json(
          { error: 'AI 서비스 사용량이 초과되었습니다. 관리자에게 문의해주세요.' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
