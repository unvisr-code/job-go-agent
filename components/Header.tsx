'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Bookmark, TrendingUp } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/upcoming', label: '예정 공고', icon: TrendingUp },
    { href: '/saved', label: '스크랩', icon: Bookmark },
    { href: '/chat', label: 'AI 채팅', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <Image
              src="/logo.png"
              alt="공채GO 로고"
              width={36}
              height={36}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight tracking-tight">
              공채<span className="text-primary">GO</span>
            </h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              효주님 전용 채용 에이전트
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 font-medium transition-all min-h-[44px] min-w-[44px] px-3',
                    isActive && 'bg-secondary shadow-sm'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="hidden sm:inline">{label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
