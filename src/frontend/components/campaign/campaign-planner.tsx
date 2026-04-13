'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarDays, CheckSquare, Plus, Trash2 } from 'lucide-react';

type PlannerTask = {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  sourceTool: string;
};

const STORAGE_KEY = 'civic-pulse-campaign-planner-v1';

export function CampaignPlanner() {
  const t = useTranslations('Campaign');
  const [tasks, setTasks] = useState<PlannerTask[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as PlannerTask[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sourceTool, setSourceTool] = useState('manual');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const sorted = useMemo(
    () => [...tasks].sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate)),
    [tasks],
  );

  function addTask() {
    if (!title.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: title.trim(),
        dueDate: dueDate || new Date().toISOString().slice(0, 10),
        done: false,
        sourceTool,
      },
    ]);
    setTitle('');
    setDueDate('');
    setSourceTool('manual');
  }

  function toggleDone(id: string) {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  return (
    <section className="space-y-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_160px_auto]">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('taskPlaceholder')}
          className="rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="rounded-xl border bg-background px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        />
        <select
          value={sourceTool}
          onChange={(e) => setSourceTool(e.target.value)}
          className="rounded-xl border bg-background px-4 py-3 text-sm shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
        >
          <option value="manual">{t('sourceManual')}</option>
          <option value="speech">{t('sourceSpeech')}</option>
          <option value="email">{t('sourceEmail')}</option>
          <option value="ad">{t('sourceAd')}</option>
          <option value="sentiment">{t('sourceSentiment')}</option>
          <option value="strategy">{t('sourceStrategy')}</option>
        </select>
        <button
          type="button"
          onClick={addTask}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> {t('addTask')}
        </button>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          sorted.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
              <button
                type="button"
                onClick={() => toggleDone(task.id)}
                className="rounded-full p-1.5 hover:bg-muted"
                aria-label={task.done ? t('markUndone') : t('markDone')}
              >
                <CheckSquare className={`h-5 w-5 ${task.done ? 'text-primary' : 'text-muted-foreground'}`} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${task.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                  {task.title}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{task.dueDate}</span>
                  <span>{t('sourceLabel')}: {task.sourceTool}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={t('removeTask')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
