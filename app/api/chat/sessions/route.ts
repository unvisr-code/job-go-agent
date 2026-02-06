import { NextRequest, NextResponse } from 'next/server';
import {
  getChatSessions,
  createChatSession,
} from '@/lib/supabase/chat-queries';

/**
 * GET /api/chat/sessions
 * 채팅 세션 목록 조회
 */
export async function GET() {
  try {
    const sessions = await getChatSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[API] Get chat sessions error:', error);
    return NextResponse.json(
      { error: '세션 목록을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/chat/sessions
 * 새 채팅 세션 생성
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await createChatSession(body.title);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('[API] Create chat session error:', error);
    return NextResponse.json(
      { error: '세션 생성에 실패했습니다.' },
      { status: 500 }
    );
  }
}
