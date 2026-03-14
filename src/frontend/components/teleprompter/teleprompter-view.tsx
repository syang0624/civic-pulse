'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Play,
  Pause,
  Maximize,
  Minimize,
  X,
  Minus,
  Plus,
  FlipHorizontal
} from 'lucide-react';

interface TeleprompterViewProps {
  content: string;
  title: string;
}

export function TeleprompterView({ content, title }: TeleprompterViewProps) {
  const t = useTranslations('Teleprompter');
  const router = useRouter();
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [fontSize, setFontSize] = useState(48);
  const [isMirrored, setIsMirrored] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    function tick(timestamp: number) {
      if (!containerRef.current) return;

      if (!lastScrollTimeRef.current) lastScrollTimeRef.current = timestamp;

      const elapsed = timestamp - lastScrollTimeRef.current;

      const pixelsPerSecond = speed * 30;
      const pixelsToScroll = (pixelsPerSecond * elapsed) / 1000;

      if (pixelsToScroll >= 1) {
        containerRef.current.scrollTop += pixelsToScroll;
        lastScrollTimeRef.current = timestamp;
      }

      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (Math.abs(scrollHeight - clientHeight - scrollTop) < 5) {
        setIsPlaying(false);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    }

    if (isPlaying) {
      lastScrollTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(tick);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, speed]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const progressValue = (scrollTop / (scrollHeight - clientHeight)) * 100;
    setProgress(Math.min(100, Math.max(0, progressValue)));
  }, []);

  const handleInteraction = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    window.addEventListener('mousemove', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    return () => {
      window.removeEventListener('mousemove', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [handleInteraction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(p => !p);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSpeed(s => Math.max(1, s - 0.5));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSpeed(s => Math.min(5, s + 0.5));
          break;
        case 'Equal':
        case 'NumpadAdd':
          if (e.ctrlKey || e.metaKey) return;
          setFontSize(s => Math.min(72, s + 4));
          break;
        case 'Minus':
        case 'NumpadSubtract':
          if (e.ctrlKey || e.metaKey) return;
          setFontSize(s => Math.max(24, s - 4));
          break;
        case 'KeyM':
          setIsMirrored(m => !m);
          break;
        case 'KeyF':
          toggleFullscreen();
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
             router.back();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, toggleFullscreen]);

  const adjustFontSize = (delta: number) => {
    setFontSize(prev => Math.min(72, Math.max(24, prev + delta)));
  };

  const adjustSpeed = (delta: number) => {
    setSpeed(prev => Math.min(5, Math.max(1, prev + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white overflow-hidden">
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`relative flex-1 overflow-y-auto no-scrollbar scroll-smooth ${isMirrored ? 'scale-x-[-1]' : ''}`}
        style={{ scrollBehavior: isPlaying ? 'auto' : 'smooth' }}
      >
        <div 
          ref={contentRef}
          className="mx-auto min-h-screen max-w-[900px] px-8 py-[40vh]"
        >
          <div className="fixed top-1/2 left-0 right-0 z-0 h-24 -translate-y-1/2 bg-white/5 pointer-events-none" />
          
          <h1 className="mb-12 text-center text-3xl font-bold text-gray-500 uppercase tracking-widest opacity-60">
            {title}
          </h1>

          <div 
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
            className="relative z-10 font-medium text-white/90 transition-all duration-300 ease-in-out text-center"
          >
            {paragraphs.map((p, i) => (
              <p key={i} className="mb-12 last:mb-0">
                {p}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-gray-800">
        <div 
          className="h-full bg-primary transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div 
        className={`absolute bottom-0 left-0 right-0 bg-black/80 backdrop-blur-md border-t border-white/10 p-4 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              aria-label={isPlaying ? t('pause') : t('play')}
            >
              {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" />}
            </button>
            
            <div className="flex flex-col gap-1">
              <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold ml-1">{t('speed')}</span>
              <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
                <button 
                  onClick={() => adjustSpeed(-0.5)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <span className="text-lg font-bold">🐢</span>
                </button>
                <div className="w-16 text-center font-mono font-bold text-lg">{speed.toFixed(1)}x</div>
                <button 
                  onClick={() => adjustSpeed(0.5)}
                  className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/10"
                >
                  <span className="text-lg font-bold">🐇</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 items-center">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{t('fontSize')}</span>
            <div className="flex items-center gap-3 bg-white/10 rounded-full px-4 py-2">
              <button onClick={() => adjustFontSize(-4)} className="hover:text-primary transition-colors">
                <Minus className="h-5 w-5" />
              </button>
              <span className="min-w-[3ch] text-center font-mono font-bold">{fontSize}</span>
              <button onClick={() => adjustFontSize(4)} className="hover:text-primary transition-colors">
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMirrored(!isMirrored)}
              className={`p-3 rounded-full transition-colors ${isMirrored ? 'bg-primary/20 text-primary' : 'hover:bg-white/10 text-gray-300'}`}
              title={t('mirror')}
            >
              <FlipHorizontal className="h-5 w-5" />
            </button>
            
            <button 
              onClick={toggleFullscreen}
              className="p-3 rounded-full hover:bg-white/10 text-gray-300 transition-colors"
              title={t('fullscreen')}
            >
              {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            </button>

            <div className="h-8 w-px bg-white/20 mx-2" />
            
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="h-5 w-5" />
              <span className="font-semibold">{t('exit')}</span>
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-center text-xs text-gray-600 hidden md:block">
          {t('shortcutsHint')}
        </div>
      </div>
    </div>
  );
}
