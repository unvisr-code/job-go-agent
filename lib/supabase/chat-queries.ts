import { supabase } from './client';
import type { ChatSession, DbChatSession, ChatMessage, DbChatMessage } from '@/types';

// ============================================
// Chat Session Queries
// ============================================

export async function getChatSessions(): Promise<ChatSession[]> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[Supabase] Get chat sessions error:', error);
    throw new Error('Failed to get chat sessions');
  }

  return (data as DbChatSession[]).map(dbToChatSession);
}

export async function getChatSession(id: string): Promise<ChatSession | null> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[Supabase] Get chat session error:', error);
    throw new Error('Failed to get chat session');
  }

  return dbToChatSession(data as DbChatSession);
}

export async function createChatSession(title?: string): Promise<ChatSession> {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({ title: title || '새 대화' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Create chat session error:', error);
    throw new Error('Failed to create chat session');
  }

  return dbToChatSession(data as DbChatSession);
}

export async function updateChatSession(
  id: string,
  updates: { title?: string; preview?: string }
): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .update(updates)
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Update chat session error:', error);
    throw new Error('Failed to update chat session');
  }
}

export async function deleteChatSession(id: string): Promise<void> {
  const { error } = await supabase
    .from('chat_sessions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] Delete chat session error:', error);
    throw new Error('Failed to delete chat session');
  }
}

// ============================================
// Chat Message Queries
// ============================================

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Supabase] Get chat messages error:', error);
    throw new Error('Failed to get chat messages');
  }

  return (data as DbChatMessage[]).map(dbToChatMessage);
}

export async function addChatMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      session_id: sessionId,
      role,
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[Supabase] Add chat message error:', error);
    throw new Error('Failed to add chat message');
  }

  // Update session preview with first user message
  if (role === 'user') {
    const preview = content.slice(0, 100);
    await supabase
      .from('chat_sessions')
      .update({ preview, title: content.slice(0, 30) || '새 대화' })
      .eq('id', sessionId);
  }

  return dbToChatMessage(data as DbChatMessage);
}

// ============================================
// Utility Functions
// ============================================

function dbToChatSession(db: DbChatSession): ChatSession {
  return {
    id: db.id,
    title: db.title,
    preview: db.preview,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

function dbToChatMessage(db: DbChatMessage): ChatMessage {
  return {
    id: db.id,
    sessionId: db.session_id,
    role: db.role as 'user' | 'assistant',
    content: db.content,
    createdAt: db.created_at,
  };
}
