'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallbackUrl?: string;
  className?: string;
}

export function BackButton({ fallbackUrl = '/', className }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Next.js router.back()을 우선 시도
    // 히스토리가 없거나 에러 발생시 fallback URL로 이동
    try {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackUrl);
      }
    } catch {
      router.push(fallbackUrl);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleBack}
      aria-label="이전 페이지로 돌아가기"
      className={`gap-2 min-h-[44px] ${className || ''}`}
    >
      <ArrowLeft className="w-4 h-4" />
      뒤로가기
    </Button>
  );
}
