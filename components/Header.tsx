'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MessageSquare, Bookmark } from 'lucide-react';

export function Header() {
  const pathname = usePathname();

  const navItems = [
    { href: '/saved', label: '스크랩', icon: Bookmark },
    { href: '/chat', label: 'AI 채팅', icon: MessageSquare },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-lg leading-tight tracking-tight">
              공채<span className="text-primary">GO</span>
            </h1>
            <p className="text-[10px] text-muted-foreground -mt-0.5">
              공공기관 채용 에이전트
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 font-medium transition-all',
                    isActive && 'bg-secondary shadow-sm'
                  )}
                >
                  <Icon className="w-4 h-4" />
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
