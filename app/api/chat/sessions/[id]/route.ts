import { NextRequest, NextResponse } from 'next/server';
import {
  getChatSession,
  getChatMessages,
  updateChatSession,
  deleteChatSession,
} from '@/lib/supabase/chat-queries';

/**
 * GET /api/chat/sessions/[id]
 * 특정 세션과 메시지 조회
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const session = await getChatSession(id);
    if (!session) {
      return NextResponse.json(
        { error: '세션을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    const messages = await getChatMessages(id);

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error('[API] Get chat session error:', error);
    return NextResponse.json(
      { error: '세션을 불러오는데 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/chat/sessions/[id]
 * 세션 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    await updateChatSession(id, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Update chat session error:', error);
    return NextResponse.json(
      { error: '세션 업데이트에 실패했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat/sessions/[id]
 * 세션 삭제
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await deleteChatSession(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Delete chat session error:', error);
    return NextResponse.json(
      { error: '세션 삭제에 실패했습니다.' },
      { status: 500 }
    );
  }
}
