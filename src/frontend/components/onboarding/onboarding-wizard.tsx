'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/frontend/lib/utils';
import { ELECTION_DISTRICTS, SIDO_CODES, ELECTION_TYPES } from '@/shared/constants';
import type { ElectionType } from '@/shared/constants';
import type { Tone, Demographic } from '@/shared/types';
import { Loader2, Check, ChevronLeft } from 'lucide-react';
import { LocaleToggle } from '@/frontend/components/layout/locale-toggle';

const TOTAL_STEPS = 8;

const COMMON_PARTIES = [
  { id: 'independent', labelKey: 'partyIndependent' },
  { id: 'custom', labelKey: 'partyCustom' },
] as const;

export function OnboardingWizard() {
  const t = useTranslations('Onboarding');
  const tCommon = useTranslations('Common');
  const tProfile = useTranslations('Profile');
  const tRegions = useTranslations('Regions');
  const tDemographics = useTranslations('Demographics');
  const router = useRouter();
  const locale = useLocale();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    name: string;
    party: string;
    partyCustom: string;
    background: string;
    electionType: ElectionType | '';
    sido: string;
    district: string;
    tone: Tone | '';
    targetDemo: Demographic[];
  }>({
    name: '',
    party: '',
    partyCustom: '',
    background: '',
    electionType: '',
    sido: '',
    district: '',
    tone: '',
    targetDemo: [],
  });

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let districtName = '';
      if (data.sido) {
        const sido = ELECTION_DISTRICTS[data.sido];
        if (sido) {
          districtName = sido.name;
          if (data.district) {
            const district = sido.districts.find((d) => d.name === data.district);
            if (district) {
              districtName = `${sido.name} ${district.name}`;
            }
          }
        }
      }

      const resolvedParty = data.party === 'custom'
        ? data.partyCustom.trim()
        : data.party === 'independent'
          ? '무소속'
          : data.party;

      const body: Record<string, unknown> = {
        locale: locale,
      };
      if (data.name.trim()) body.name = data.name.trim();
      if (resolvedParty) body.party = resolvedParty;
      if (data.background.trim()) body.background = data.background.trim();
      if (data.sido) body.district_code = data.sido;
      if (districtName) body.district_name = districtName;
      if (data.electionType) body.election_type = data.electionType;
      if (data.tone) body.tone = data.tone;
      if (data.targetDemo.length > 0) body.target_demo = data.targetDemo;

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || t('saveFailed'));
      }
      
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
      setIsSubmitting(false);
    }
  };

  const handleSelection = <K extends keyof typeof data>(field: K, value: typeof data[K]) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSidoSelect = (sidoCode: string) => {
    setData((prev) => ({ ...prev, sido: sidoCode, district: '' }));
  };

  const handleDistrictSelect = (districtName: string) => {
    setData((prev) => ({ ...prev, district: districtName }));
  };

  const toggleDemographic = (demo: Demographic) => {
    setData((prev) => {
      const exists = prev.targetDemo.includes(demo);
      if (exists) {
        return { ...prev, targetDemo: prev.targetDemo.filter((d) => d !== demo) };
      } else {
        if (prev.targetDemo.length >= 3) return prev;
        return { ...prev, targetDemo: [...prev.targetDemo, demo] };
      }
    });
  };

  const isNextDisabled = (): boolean => {
    switch (step) {
      case 2: return !data.name.trim();
      case 3: return !data.electionType;
      case 4: {
        if (!data.sido) return true;
        if (['local_mayor', 'local_council'].includes(data.electionType) && !data.district) return true;
        return false;
      }
      case 5: return !data.party || (data.party === 'custom' && !data.partyCustom.trim());
      case 6: return false; // background is optional
      case 7: return !data.tone;
      case 8: return data.targetDemo.length === 0;
      default: return false;
    }
  };

  // Step 1: Welcome
  if (step === 1) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="fixed top-4 right-4 z-10">
          <LocaleToggle />
        </div>
        <div className="mb-8 max-w-md space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t('welcomeTitle')}</h1>
          <p className="text-xl text-muted-foreground">{t('welcomeDesc')}</p>
        </div>
        <button
          onClick={handleNext}
          className="rounded-full bg-primary px-10 py-4 text-lg font-bold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
        >
          {t('start')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center p-6 animate-in slide-in-from-right-8 duration-300">
      <div className="fixed top-0 left-0 h-[3px] w-full bg-muted">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="fixed top-4 left-4 right-4 z-10 flex items-center justify-between">
        <button
          onClick={() => setStep(step - 1)}
          className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {tCommon('back')}
        </button>
        <LocaleToggle />
      </div>

      <div className="mt-20 w-full max-w-lg space-y-8">
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-sm font-medium text-destructive">
            {error}
          </div>
        )}

        {/* Step 2: Name */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{t('stepNameTitle')}</h2>
              <p className="text-lg text-muted-foreground">{t('stepNameDesc')}</p>
            </div>
            <input
              type="text"
              value={data.name}
              onChange={(e) => handleSelection('name', e.target.value)}
              placeholder={t('stepNamePlaceholder')}
              autoFocus
              className="w-full rounded-xl border-2 border-border bg-background p-4 text-lg outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>
        )}

        {/* Step 3: Election Type */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t('step1Title')}</h2>
            <div className="space-y-3">
              {ELECTION_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => handleSelection('electionType', type)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border-2 p-5 text-left transition-all duration-200",
                    data.electionType === type
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-lg font-medium">
                    {type === 'metropolitan_mayor' && tProfile('electionMetropolitanMayor')}
                    {type === 'metropolitan_council' && tProfile('electionMetropolitanCouncil')}
                    {type === 'local_mayor' && tProfile('electionLocalMayor')}
                    {type === 'local_council' && tProfile('electionLocalCouncil')}
                    {type === 'superintendent' && tProfile('electionSuperintendent')}
                  </span>
                  {data.electionType === type && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Region */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t('step2Title')}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">{t('selectSido')}</label>
                <select
                  value={data.sido}
                  onChange={(e) => handleSidoSelect(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-background p-4 text-lg outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled>{t('selectSido')}</option>
                  {SIDO_CODES.map((code) => (
                    <option key={code} value={code}>
                      {tRegions(code)}
                    </option>
                  ))}
                </select>
              </div>

              {data.sido && 
               ['local_mayor', 'local_council'].includes(data.electionType) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-medium text-muted-foreground">{t('selectDistrict')}</label>
                  <select
                    value={data.district}
                    onChange={(e) => handleDistrictSelect(e.target.value)}
                    className="w-full rounded-xl border-2 border-border bg-background p-4 text-lg outline-none focus:border-primary transition-colors"
                  >
                    <option value="" disabled>{t('selectDistrict')}</option>
                    {ELECTION_DISTRICTS[data.sido]?.districts.map((d) => (
                      <option key={d.name} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Party */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{t('stepPartyTitle')}</h2>
              <p className="text-lg text-muted-foreground">{t('stepPartyDesc')}</p>
            </div>
            <div className="space-y-3">
              {COMMON_PARTIES.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelection('party', p.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border-2 p-5 text-left transition-all duration-200",
                    data.party === p.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <span className="text-lg font-medium">{t(p.labelKey)}</span>
                  {data.party === p.id && <Check className="h-5 w-5" />}
                </button>
              ))}
            </div>
            {data.party === 'custom' && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <input
                  type="text"
                  value={data.partyCustom}
                  onChange={(e) => handleSelection('partyCustom', e.target.value)}
                  placeholder={t('stepPartyPlaceholder')}
                  autoFocus
                  className="w-full rounded-xl border-2 border-border bg-background p-4 text-lg outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 6: Background / Campaign Context */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{t('stepBackgroundTitle')}</h2>
              <p className="text-lg text-muted-foreground">{t('stepBackgroundDesc')}</p>
            </div>
            <textarea
              value={data.background}
              onChange={(e) => handleSelection('background', e.target.value)}
              placeholder={t('stepBackgroundPlaceholder')}
              rows={5}
              className="w-full resize-none rounded-xl border-2 border-border bg-background p-4 text-lg leading-relaxed outline-none transition-colors focus:border-primary placeholder:text-muted-foreground/50"
            />
            <p className="text-sm text-muted-foreground/70">{t('stepBackgroundHint')}</p>
          </div>
        )}

        {/* Step 7: Tone */}
        {step === 7 && (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">{t('step3Title')}</h2>
            <div className="space-y-3">
              {[
                { id: 'formal', label: tProfile('toneFormal'), desc: t('formalDesc') },
                { id: 'conversational', label: tProfile('toneConversational'), desc: t('conversationalDesc') },
                { id: 'passionate', label: tProfile('tonePassionate'), desc: t('passionateDesc') },
                { id: 'data_driven', label: tProfile('toneDataDriven'), desc: t('dataDrivenDesc') }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelection('tone', item.id as Tone)}
                  className={cn(
                    "w-full rounded-xl border-2 p-5 text-left transition-all duration-200",
                    data.tone === item.id
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-card hover:border-primary/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold">{item.label}</span>
                    {data.tone === item.id && <Check className="h-5 w-5" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground opacity-80">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 8: Target Demographics */}
        {step === 8 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">{t('step4Title')}</h2>
              <p className="text-lg text-muted-foreground">{t('maxSelection', { count: 3 })}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'youth', icon: '🌱' },
                { id: 'elderly', icon: '👴' },
                { id: 'families', icon: '👨‍👩‍👧‍👦' },
                { id: 'businessOwners', icon: '🏪' },
                { id: 'workers', icon: '👷' },
                { id: 'students', icon: '🎓' }
              ].map((item) => {
                const isSelected = data.targetDemo.includes(item.id as Demographic);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleDemographic(item.id as Demographic)}
                    className={cn(
                      "flex flex-col items-center justify-center space-y-2 rounded-xl border-2 p-6 transition-all duration-200",
                      isSelected
                        ? "border-primary bg-primary/5 text-primary scale-105"
                        : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <span className="text-4xl">{item.icon}</span>
                    <span className="font-bold">{tDemographics(item.id)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 left-0 w-full border-t bg-background/80 p-4 backdrop-blur-md">
        <div className="mx-auto max-w-lg flex gap-3">
          {step === 6 && !data.background.trim() && (
            <button
              onClick={handleNext}
              className="flex-1 rounded-xl border-2 border-border py-4 text-lg font-bold text-muted-foreground transition-all hover:bg-accent active:scale-95"
            >
              {t('skip')}
            </button>
          )}
          <button
            onClick={step === TOTAL_STEPS ? handleSubmit : handleNext}
            disabled={isNextDisabled() || isSubmitting}
            className={cn(
              "rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground transition-all active:scale-95 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground",
              step === 6 && !data.background.trim() ? "flex-1" : "w-full"
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('completing')}
              </span>
            ) : step === TOTAL_STEPS ? (
              t('complete')
            ) : (
              t('next')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
