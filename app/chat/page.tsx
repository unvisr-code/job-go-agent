import { ChatInterface } from '@/components/ChatInterface';

export const metadata = {
  title: 'AI 채팅 - 공채GO',
  description: '대화형 채용공고 검색 및 추천',
};

export default function ChatPage() {
  return (
    <div className="h-[calc(100dvh-4rem)] flex flex-col">
      <div className="flex-1 min-h-0">
        <ChatInterface />
      </div>
    </div>
  );
}
