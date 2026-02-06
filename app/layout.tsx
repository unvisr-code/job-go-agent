import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/Header';
import { PasswordGate } from '@/components/PasswordGate';

export const metadata: Metadata = {
  title: '공채GO - 효주님을 위한 공공기관 채용 에이전트',
  description: '효주님, 공공기관 인턴/채용 공고를 AI가 함께 찾아드려요.',
  keywords: ['공공기관', '채용', '인턴', '취업', 'AI', '채용공고'],

  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },

  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://job-go-agent.vercel.app',
    siteName: '공채GO',
    title: '공채GO - 효주님을 위한 공공기관 채용 에이전트',
    description: '효주님, 공공기관 인턴/채용 공고를 AI가 함께 찾아드려요.',
    images: [
      {
        url: 'https://job-go-agent.vercel.app/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: '공채GO - 효주님을 위한 공공기관 채용 에이전트',
    images: ['https://job-go-agent.vercel.app/og-image.png'],
  },

  metadataBase: new URL('https://job-go-agent.vercel.app'),
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
          <PasswordGate>
            <div className="min-h-screen">
              <Header />
              <main>{children}</main>
            </div>
          </PasswordGate>
        </Providers>
      </body>
    </html>
  );
}
