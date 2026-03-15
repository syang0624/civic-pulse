'use client';

import { useEffect, useState } from 'react';
import { useLocale } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

interface GeneratingOverlayProps {
  visible: boolean;
}

export function GeneratingOverlay({ visible }: GeneratingOverlayProps) {
  const locale = useLocale();
  const [messageIndex, setMessageIndex] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }

    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const messages = locale === 'ko' ? [
    "AI가 열심히 분석하고 있어요...",
    "더 나은 사회를 위해 고민 중...",
    "유권자의 마음을 읽는 중...",
    "최고의 전략을 만들어 볼게요!",
    "데이터를 꼼꼼히 살펴보는 중...",
    "거의 다 됐어요! 조금만 기다려주세요..."
  ] : [
    "AI is working hard for you...",
    "Thinking about a better society...",
    "Reading the voters' minds...",
    "Crafting the best strategy!",
    "Carefully analyzing the data...",
    "Almost there! Just a moment..."
  ];

  useEffect(() => {
    if (!visible) return;
    
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => clearInterval(interval);
  }, [visible, messages.length]);

  if (!show) return null;

  return (
    <div 
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="relative flex w-[90%] max-w-md flex-col items-center justify-center rounded-3xl bg-card/90 p-8 shadow-2xl backdrop-blur-xl border border-white/10 ring-1 ring-black/5 dark:ring-white/10">
        
        <div className="relative mb-8 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
            <div className="absolute top-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40 blur-[1px]" />
            <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-500/40 blur-[1px]" />
          </div>
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite_reverse] opacity-70">
            <div className="absolute top-1/2 right-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-purple-500/40 blur-[1px]" />
            <div className="absolute top-1/2 left-0 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-blue-500/40 blur-[1px]" />
          </div>

          <div className="relative z-10 animate-[bounce_2s_infinite]">
            <div className="absolute inset-0 animate-ping opacity-20 blur-xl bg-primary rounded-full" />
            <Sparkles className="h-12 w-12 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
          </div>
        </div>

        <div className="relative h-16 w-full text-center overflow-hidden">
          {messages.map((msg, idx) => (
            <p
              key={idx}
              className={cn(
                "absolute inset-0 flex items-center justify-center text-lg font-medium text-foreground transition-all duration-500",
                idx === messageIndex 
                  ? "translate-y-0 opacity-100 scale-100" 
                  : "translate-y-full opacity-0 scale-95"
              )}
            >
              {msg}
            </p>
          ))}
        </div>

        <div className="mt-6 h-1.5 w-48 overflow-hidden rounded-full bg-muted">
          <div className="h-full w-full origin-left animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-primary/50 to-transparent -translate-x-full" />
        </div>
        
        <style jsx global>{`
          @keyframes shimmer {
            100% {
              transform: translateX(100%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
