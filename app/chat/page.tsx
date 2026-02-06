import { ChatInterface } from '@/components/ChatInterface';

export const metadata = {
  title: 'AI 채팅 - 공채GO',
  description: '대화형 채용공고 검색 및 추천',
};

export default function ChatPage() {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="glass rounded-2xl border border-border/50 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
