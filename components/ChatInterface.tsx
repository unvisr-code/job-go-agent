'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  StopCircle,
} from 'lucide-react';
import type { ChatSession } from '@/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

/**
 * 간단한 마크다운 렌더링
 */
function renderMarkdown(text: string, onJobClick?: (jobId: string) => void) {
  const parts: React.ReactNode[] = [];
  let key = 0;

  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) {
      parts.push(<br key={`br-${key++}`} />);
    }

    const pattern = /(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${key++}`}>
            {line.slice(lastIndex, match.index)}
          </span>
        );
      }

      const matched = match[0];

      if (matched.startsWith('**') && matched.endsWith('**')) {
        const boldText = matched.slice(2, -2);
        parts.push(
          <strong key={`bold-${key++}`} className="font-semibold">
            {boldText}
          </strong>
        );
      } else if (matched.startsWith('[')) {
        const linkMatch = matched.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
          const [, linkText, url] = linkMatch;
          const jobMatch = url.match(/^\/jobs\/([a-f0-9-]+)$/i);
          if (jobMatch && onJobClick) {
            const jobId = jobMatch[1];
            parts.push(
              <button
                key={`link-${key++}`}
                onClick={() => onJobClick(jobId)}
                className="text-primary hover:underline font-medium cursor-pointer"
              >
                {linkText}
              </button>
            );
          } else if (url.startsWith('http')) {
            parts.push(
              <a
                key={`link-${key++}`}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                {linkText}
              </a>
            );
          } else {
            parts.push(
              <span key={`link-${key++}`} className="text-primary font-medium">
                {linkText}
              </span>
            );
          }
        }
      }

      lastIndex = match.index + matched.length;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={`text-${key++}`}>{line.slice(lastIndex)}</span>
      );
    }
  });

  return parts;
}

/**
 * 타이핑 인디케이터 컴포넌트
 */
function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-1">
      <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
    </div>
  );
}

export function ChatInterface() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 공고 상세 페이지로 이동
  const handleJobClick = useCallback((jobId: string) => {
    router.push(`/jobs/${jobId}`);
  }, [router]);

  // 스크롤을 맨 아래로 이동 (smooth)
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    // requestAnimationFrame으로 DOM 업데이트 후 실행 보장
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
  }, []);

  // 즉시 스크롤 (애니메이션 없이)
  const scrollToBottomInstant = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant', block: 'end' });
    });
  }, []);

  // 세션 목록 로드
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // 특정 세션 로드
  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(
          data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant',
            content: m.content,
            createdAt: new Date(m.createdAt),
          }))
        );
        setCurrentSessionId(sessionId);
        setShowSidebar(false);
        // 세션 로드 후 즉시 스크롤
        setTimeout(() => scrollToBottomInstant(), 100);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  }, [scrollToBottomInstant]);

  // 새 세션 생성
  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/sessions', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSessions((prev) => [data.session, ...prev]);
        setCurrentSessionId(data.session.id);
        setMessages([]);
        setShowSidebar(false);
        // 새 세션 후 입력창 포커스
        setTimeout(() => textareaRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, []);

  // 세션 삭제
  const deleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) {
          setCurrentSessionId(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  }, [currentSessionId]);

  // 초기 로드
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 메시지 변경 시 스크롤 (로딩 중에도)
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // 초기 포커스
  useEffect(() => {
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();

    // 입력창 즉시 초기화 및 포커스 유지
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.focus();
    }

    // 세션이 없으면 자동 생성
    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const res = await fetch('/api/chat/sessions', { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          sessionId = data.session.id;
          setSessions((prev) => [data.session, ...prev]);
          setCurrentSessionId(sessionId);
        }
      } catch {
        // 세션 생성 실패해도 계속 진행
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      createdAt: new Date(),
    };

    // 메시지 추가 후 즉시 스크롤
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          sessionId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadSessions();
    } catch (error) {
      console.error('Chat error:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해주세요.',
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // 응답 후 입력창 포커스
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 제안 클릭 시 바로 전송
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    // 다음 렌더 사이클에서 전송
    setTimeout(() => {
      const event = { key: 'Enter', shiftKey: false, preventDefault: () => {} } as React.KeyboardEvent;
      handleKeyDown(event);
    }, 0);
  };

  const suggestions = [
    { text: '서울 데이터 분석 인턴 찾아줘', icon: '🔍' },
    { text: '마감 임박한 공고 추천해줘', icon: '⏰' },
    { text: '한국전력공사 언제 채용해?', icon: '🔮' },
    { text: '경기도 행정 인턴 검색해줘', icon: '📋' },
  ];

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar - 세션 목록 */}
      <div
        className={cn(
          'absolute md:relative z-20 h-full bg-background border-r border-border/50 transition-all duration-200',
          showSidebar ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:w-64 md:translate-x-0'
        )}
      >
        <div className="flex flex-col h-full w-64 overflow-hidden">
          {/* 새 채팅 버튼 */}
          <div className="p-3 border-b border-border/50 shrink-0">
            <Button
              onClick={createNewSession}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Plus className="w-4 h-4" />
              새 채팅
            </Button>
          </div>

          {/* 세션 목록 */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2 space-y-1">
              {isLoadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  대화 기록이 없습니다
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => loadSession(session.id)}
                    onKeyDown={(e) => e.key === 'Enter' && loadSession(session.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors group flex items-center gap-2 cursor-pointer',
                      currentSessionId === session.id
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <MessageSquare className="w-4 h-4 shrink-0" />
                    <span className="flex-1 truncate">
                      {session.title || '새 대화'}
                    </span>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg transition-opacity min-w-[36px] min-h-[36px] flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/20 z-10 md:hidden"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 p-2 border-b border-border/50 shrink-0 bg-background">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSidebar(!showSidebar)}
            className="shrink-0"
          >
            {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <span className="text-sm font-medium truncate">
            {sessions.find((s) => s.id === currentSessionId)?.title || 'AI 채팅'}
          </span>
        </div>

        {/* Messages area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto overscroll-contain"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-5 shadow-lg shadow-primary/20">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">무엇을 도와드릴까요?</h2>
              <p className="text-muted-foreground mb-6 max-w-sm text-sm">
                채용공고 검색, 추천, 그리고 예정 공고 예측까지 도와드려요
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="flex items-center gap-2.5 text-left px-3.5 py-2.5 rounded-xl border border-border/50 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all active:scale-[0.98]"
                  >
                    <span className="text-base">{suggestion.icon}</span>
                    <span className="flex-1">{suggestion.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6">
              <div className="space-y-6 max-w-3xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}

                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      )}
                    >
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.role === 'assistant'
                          ? renderMarkdown(message.content, handleJobClick)
                          : message.content}
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                        <User className="w-4 h-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {/* 로딩 인디케이터 */}
                {isLoading && (
                  <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                      <TypingIndicator />
                    </div>
                  </div>
                )}

                {/* 스크롤 앵커 */}
                <div ref={messagesEndRef} className="h-1" />
              </div>
            </div>
          )}
        </div>

        {/* Input area - Safe Area 대응 */}
        <div className="shrink-0 border-t border-border/50 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-muted/40 rounded-2xl border border-border/50 focus-within:border-primary/50 focus-within:bg-muted/60 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="w-full min-h-[52px] max-h-[150px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 pl-4 pr-14 py-3.5 text-sm placeholder:text-muted-foreground/50"
                rows={1}
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'absolute right-2 bottom-2 w-11 h-11 rounded-xl transition-all',
                  input.trim() && !isLoading
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                    : 'bg-transparent text-muted-foreground/50 hover:bg-transparent'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground/50 text-center mt-2 hidden sm:block">
              Enter로 전송 · Shift+Enter로 줄바꿈
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
