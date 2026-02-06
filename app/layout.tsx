import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: '공채GO - 공공기관 채용 에이전트',
  description:
    'AI 기반 공공기관 인턴/채용 공고 검색 및 대화형 탐색 서비스',
  keywords: ['공공기관', '채용', '인턴', '취업', 'AI', '채용공고'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen">
        <Providers>
          <div className="relative min-h-screen">
            {/* Background mesh gradient */}
            <div className="fixed inset-0 mesh-gradient pointer-events-none" />

            {/* Content */}
            <div className="relative z-10">
              <Header />
              <main>{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
