import { ChatInterface } from '@/components/ChatInterface';
import { MessageSquare, Clock } from 'lucide-react';

export const metadata = {
  title: 'AI 채팅 - 공채GO',
  description: '대화형 채용공고 검색 및 추천',
};

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-4 relative">
      {/* 블러 처리된 배경 */}
      <div className="glass rounded-2xl border border-border/50 overflow-hidden blur-sm pointer-events-none select-none opacity-50">
        <ChatInterface />
      </div>

      {/* 오픈 예정 팝업 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center animate-in zoom-in-95 fade-in duration-300">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>

          <h2 className="text-2xl font-bold mb-2">AI 채팅</h2>
          <p className="text-muted-foreground mb-6">
            효주님을 위한 AI 취업 코치가<br />
            곧 찾아갑니다!
          </p>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium">
            <Clock className="w-4 h-4" />
            내일 오픈 예정
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            공고 검색, 맞춤 추천, 취업 상담까지<br />
            AI가 도와드릴게요
          </p>
        </div>
      </div>
    </div>
  );
}
