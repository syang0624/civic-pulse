'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, Newspaper, Brain, ListChecks, CheckCircle2 } from 'lucide-react';
import { cn } from '@/frontend/lib/utils';

interface CrawlProgressOverlayProps {
  isActive: boolean;
  onComplete?: () => void;
}

type Stage = {
  labelKey: string;
  icon: React.ElementType;
};

const STAGES: Stage[] = [
  { labelKey: 'crawlStage1', icon: Search },
  { labelKey: 'crawlStage2', icon: Newspaper },
  { labelKey: 'crawlStage3', icon: Brain },
  { labelKey: 'crawlStage4', icon: ListChecks },
];

export function CrawlProgressOverlay({ isActive, onComplete }: CrawlProgressOverlayProps) {
  const t = useTranslations('Dashboard');
  const [progress, setProgress] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    if (isActive) {
      timeouts.push(setTimeout(() => { setIsVisible(true); setIsCompleted(false); setProgress(0); setCurrentStageIndex(0); }, 0));
      timeouts.push(setTimeout(() => { setProgress(15); setCurrentStageIndex(0); }, 100));
      timeouts.push(setTimeout(() => { setProgress(40); setCurrentStageIndex(1); }, 2000));
      timeouts.push(setTimeout(() => { setProgress(75); setCurrentStageIndex(2); }, 5000));
      timeouts.push(setTimeout(() => { setProgress(95); setCurrentStageIndex(3); }, 10000));
    } else if (isVisible && !isCompleted) {
      timeouts.push(setTimeout(() => { setProgress(100); setIsCompleted(true); }, 0));
    } else if (isVisible && isCompleted) {
      timeouts.push(setTimeout(() => { setIsVisible(false); onComplete?.(); }, 800));
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [isActive, isVisible, isCompleted, onComplete]);

  if (!isVisible) return null;

  const CurrentIcon = isCompleted ? CheckCircle2 : STAGES[currentStageIndex].icon;
  const currentLabel = isCompleted ? t('crawlComplete') : t(STAGES[currentStageIndex].labelKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CurrentIcon 
            className={cn(
              "h-8 w-8 text-primary transition-all duration-500", 
              isCompleted ? "scale-110" : "animate-pulse"
            )} 
          />
        </div>
        
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {currentLabel}
        </h3>
        
        <p className="mb-6 text-sm text-muted-foreground">
          {t('crawlWaiting')}
        </p>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-700 ease-in-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <div className="mt-2 flex justify-end">
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        </div>
      </div>
    </div>
  );
}
