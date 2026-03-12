'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import type {
  PolicyPosition,
  Tone,
  Priority,
  Demographic,
  Locale as AppLocale,
} from '@/shared/types';
import {
  ISSUE_CATEGORIES,
  ELECTION_DISTRICTS,
  SIDO_CODES,
  ELECTION_TYPES,
  type ElectionType,
} from '@/shared/constants';

const TONES: Tone[] = ['formal', 'conversational', 'passionate', 'data_driven'];
const PRIORITIES: Priority[] = ['high', 'medium', 'low'];
const DEMOGRAPHICS: Demographic[] = [
  'youth',
  'elderly',
  'families',
  'businessOwners',
  'workers',
  'students',
];

const ELECTION_TYPE_I18N_KEYS: Record<ElectionType, string> = {
  metropolitan_mayor: 'electionMetropolitanMayor',
  metropolitan_council: 'electionMetropolitanCouncil',
  local_mayor: 'electionLocalMayor',
  local_council: 'electionLocalCouncil',
  superintendent: 'electionSuperintendent',
};

export function ProfileForm() {
  const t = useTranslations('Profile');
  const tc = useTranslations('Categories');
  const td = useTranslations('Demographics');
  const tCommon = useTranslations('Common');
  const currentLocale = useLocale();
  const languageKey: 'ko' | 'en' = currentLocale === 'ko' ? 'ko' : 'en';


  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);


  const [name, setName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [electionType, setElectionType] = useState<ElectionType>('local_mayor');
  const [party, setParty] = useState('');
  const [background, setBackground] = useState('');
  const [tone, setTone] = useState<Tone>('formal');
  const [targetDemo, setTargetDemo] = useState<Demographic[]>([]);
  const [locale, setLocale] = useState<AppLocale>('ko');


  const [positions, setPositions] = useState<PolicyPosition[]>([]);


  const [showPositionModal, setShowPositionModal] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PolicyPosition | null>(
    null,
  );
  const [positionSaving, setPositionSaving] = useState(false);


  const [posTopic, setPosTopic] = useState<string>(ISSUE_CATEGORIES[0]);
  const [posStance, setPosStance] = useState('');
  const [posPriority, setPosPriority] = useState<Priority>('medium');
  const [posKeyNumber, setPosKeyNumber] = useState('');
  const [posTalkingPoints, setPosTalkingPoints] = useState<string[]>(['']);


  const toneLabels: Record<Tone, string> = {
    formal: t('toneFormal'),
    conversational: t('toneConversational'),
    passionate: t('tonePassionate'),
    data_driven: t('toneDataDriven'),
  };


  const priorityLabels: Record<Priority, string> = {
    high: t('priorityHigh'),
    medium: t('priorityMedium'),
    low: t('priorityLow'),
  };


  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setName(data.name);
          setDistrictCode(data.district_code);
          setDistrictName(data.district_name);
          setElectionType((data.election_type ?? 'local_mayor') as ElectionType);
          setParty(data.party);
          setBackground(data.background ?? '');
          setTone(data.tone);
          setTargetDemo(data.target_demo);
          setLocale(data.locale);
          setPositions(data.positions ?? []);
        } else {

          setParty(t('partyIndependent'));
        }
      } catch {
        setFeedback({ type: 'error', message: tCommon('error') });
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [t, tCommon]);


  async function handleSaveProfile() {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          district_code: districtCode,
          district_name: districtName,
          election_type: electionType,
          party,
          background: background || undefined,
          tone,
          target_demo: targetDemo,
          locale,
        }),
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: t('saveSuccess') });
      } else {
        const data = await res.json();
        setFeedback({
          type: 'error',
          message: data.error ?? tCommon('error'),
        });
      }
    } catch {
      setFeedback({ type: 'error', message: tCommon('error') });
    } finally {
      setSaving(false);
    }
  }


  function toggleDemo(demo: Demographic) {
    setTargetDemo((prev) =>
      prev.includes(demo)
        ? prev.filter((d) => d !== demo)
        : [...prev, demo],
    );
  }


  function openAddPosition() {
    setEditingPosition(null);
    setPosTopic(ISSUE_CATEGORIES[0]);
    setPosStance('');
    setPosPriority('medium');
    setPosKeyNumber('');
    setPosTalkingPoints(['']);
    setShowPositionModal(true);
  }


  function openEditPosition(pos: PolicyPosition) {
    setEditingPosition(pos);
    setPosTopic(pos.topic);
    setPosStance(pos.stance);
    setPosPriority(pos.priority);
    setPosKeyNumber(pos.key_number ?? '');
    setPosTalkingPoints(
      pos.talking_points.length > 0 ? [...pos.talking_points] : [''],
    );
    setShowPositionModal(true);
  }


  async function handleSavePosition() {
    setPositionSaving(true);
    try {
      const body = {
        topic: posTopic,
        stance: posStance,
        priority: posPriority,
        key_number: posKeyNumber || undefined,
        talking_points: posTalkingPoints.filter((tp) => tp.trim() !== ''),
      };

      const url = editingPosition
        ? `/api/profile/positions/${editingPosition.id}`
        : '/api/profile/positions';
      const method = editingPosition ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved: PolicyPosition = await res.json();
        if (editingPosition) {
          setPositions((prev) =>
            prev.map((p) => (p.id === saved.id ? saved : p)),
          );
        } else {
          setPositions((prev) => [...prev, saved]);
        }
        setShowPositionModal(false);
      } else {
        const data = await res.json();
        setFeedback({
          type: 'error',
          message: data.error ?? tCommon('error'),
        });
      }
    } catch {
      setFeedback({ type: 'error', message: tCommon('error') });
    } finally {
      setPositionSaving(false);
    }
  }


  async function handleDeletePosition(id: string) {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/profile/positions/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPositions((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      setFeedback({ type: 'error', message: tCommon('error') });
    }
  }


  function addTalkingPoint() {
    if (posTalkingPoints.length < 10) {
      setPosTalkingPoints((prev) => [...prev, '']);
    }
  }

  function removeTalkingPoint(index: number) {
    setPosTalkingPoints((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTalkingPoint(index: number, value: string) {
    setPosTalkingPoints((prev) =>
      prev.map((tp, i) => (i === index ? value : tp)),
    );
  }

  const selectedSido = districtCode ? ELECTION_DISTRICTS[districtCode] : undefined;
  const selectedDistricts = selectedSido?.districts ?? [];
  const hasSubDistricts = selectedDistricts.length > 0;
  const hasSelectedSubDistrict = hasSubDistricts && districtName.length > 0;
  const enabledElectionTypes = ELECTION_TYPES.filter((type) => {
    if (type === 'local_mayor' || type === 'local_council') {
      return hasSelectedSubDistrict;
    }
    return true;
  });

  useEffect(() => {
    if (!hasSelectedSubDistrict && (electionType === 'local_mayor' || electionType === 'local_council')) {
      setElectionType('metropolitan_mayor');
    }
  }, [hasSelectedSubDistrict, electionType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">{tCommon('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-xl border px-6 py-4 text-sm font-medium animate-fade-in ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ── Basic Info ── */}
      <section className="space-y-8 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold tracking-tight">{t('basicInfo')}</h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-3">
            <label htmlFor="profile-name" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('name')}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              maxLength={100}
            />
          </div>

          {/* Party */}
          <div className="space-y-3">
            <label htmlFor="profile-party" className="block text-sm font-semibold tracking-wide text-foreground">
              {t('party')}
            </label>
            <input
              id="profile-party"
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder={t('partyIndependent')}
              className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="space-y-3">
            <label
              htmlFor="profile-district-code"
              className="block text-sm font-semibold tracking-wide text-foreground"
            >
              {t('districtCode')}
            </label>
            <div className="relative">
              <select
                id="profile-district-code"
                value={districtCode}
                onChange={(e) => {
                  const nextCode = e.target.value;
                  setDistrictCode(nextCode);
                  const nextSido = ELECTION_DISTRICTS[nextCode];
                  if (!nextSido || nextSido.districts.length === 0) {
                    setDistrictName('');
                    return;
                  }
                  if (!nextSido.districts.some((d) => d.name === districtName)) {
                    setDistrictName('');
                  }
                }}
                className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              >
                <option value="">{t('selectSido')}</option>
                {SIDO_CODES.map((code) => {
                  const sido = ELECTION_DISTRICTS[code];
                  const label =
                    languageKey === 'ko'
                      ? `${sido.shortName} (${sido.name})`
                      : `${sido.nameEn} (${sido.name})`;
                  return (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {hasSubDistricts && (
            <div className="space-y-3">
              <label
                htmlFor="profile-district-name"
                className="block text-sm font-semibold tracking-wide text-foreground"
              >
                {t('districtName')}
              </label>
              <div className="relative">
                <select
                  id="profile-district-name"
                  value={districtName}
                  onChange={(e) => setDistrictName(e.target.value)}
                  disabled={!districtCode}
                  className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
                >
                  <option value="">{t('selectDistrict')}</option>
                  {selectedDistricts.map((district) => (
                    <option key={district.name} value={district.name}>
                      {languageKey === 'ko' ? district.name : `${district.nameEn} (${district.name})`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="space-y-3 sm:col-span-2">
            <span className="block text-sm font-semibold tracking-wide text-foreground">
              {t('electionType')}
            </span>
            <div className="flex flex-wrap gap-3">
              {ELECTION_TYPES.map((type) => {
                const isEnabled = enabledElectionTypes.includes(type);

                return (
                  <label
                    key={type}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${
                      !isEnabled 
                        ? 'cursor-not-allowed opacity-50 bg-muted text-muted-foreground' 
                        : electionType === type
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                          : 'bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile-election-type"
                      value={type}
                      checked={electionType === type}
                      onChange={() => setElectionType(type)}
                      disabled={!isEnabled}
                      className="sr-only"
                    />
                    {t(ELECTION_TYPE_I18N_KEYS[type])}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="space-y-3">
          <label htmlFor="profile-background" className="block text-sm font-semibold tracking-wide text-foreground">
            {t('background')}
          </label>
          <textarea
            id="profile-background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="min-h-[120px] w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <p className="text-xs text-muted-foreground pl-1">
            {t('backgroundHelper')}
          </p>
        </div>

        {/* Tone */}
        <div className="space-y-3">
          <label htmlFor="profile-tone" className="block text-sm font-semibold tracking-wide text-foreground">
            {t('tone')}
          </label>
          <div className="relative">
            <select
              id="profile-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value as Tone)}
              className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
            >
              {TONES.map((toneValue) => (
                <option key={toneValue} value={toneValue}>
                  {toneLabels[toneValue]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Demographics */}
        <div className="space-y-3">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('targetDemo')}</span>
          <div className="flex flex-wrap gap-3">
            {DEMOGRAPHICS.map((demo) => (
              <label
                key={demo}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${
                  targetDemo.includes(demo)
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  checked={targetDemo.includes(demo)}
                  onChange={() => toggleDemo(demo)}
                  className="sr-only"
                />
                {td(demo)}
              </label>
            ))}
          </div>
        </div>

        {/* Language */}
        <div className="space-y-3">
          <span className="block text-sm font-semibold tracking-wide text-foreground">{t('language')}</span>
          <div className="flex gap-3">
            {(['ko', 'en'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`rounded-full border px-6 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${
                  locale === loc
                    ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                    : 'bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {loc === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="pt-4">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
          >
            {saving ? tCommon('loading') : tCommon('save')}
          </button>
        </div>
      </section>

      {/* ── Divider ── */}
      <hr className="border-border/50" />

      {/* ── Policy Positions ── */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight">{t('positions')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('positionsSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddPosition}
            className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
          >
            {t('addPosition')}
          </button>
        </div>

        {/* Position cards */}
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed p-12 text-center">
            <p className="text-muted-foreground">{t('noPositions')}</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {positions.map((pos) => (
              <div key={pos.id} className="group space-y-4 rounded-2xl border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-lg text-foreground">
                        {tc(pos.topic)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          pos.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : pos.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {priorityLabels[pos.priority]}
                      </span>
                    </div>
                    <p className="text-base text-muted-foreground leading-relaxed">
                      {pos.stance}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEditPosition(pos)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {tCommon('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePosition(pos.id)}
                      className="rounded-lg px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>

                {pos.key_number && (
                  <div className="rounded-lg bg-muted/30 p-3">
                    <p className="text-sm">
                      <span className="font-semibold text-foreground">{t('keyNumber')}:</span>{' '}
                      <span className="text-muted-foreground">{pos.key_number}</span>
                    </p>
                  </div>
                )}

                {pos.talking_points.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {t('talkingPoints')}
                    </span>
                    <ul className="space-y-1">
                      {pos.talking_points.map((tp, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary/40" />
                          <span>{tp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Position Modal ── */}
      {showPositionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl border bg-background p-6 shadow-2xl animate-scale-in sm:p-8">
            <h3 className="text-xl font-bold tracking-tight">
              {editingPosition ? t('editPosition') : t('addPosition')}
            </h3>

            {/* Topic */}
            <div className="space-y-3">
              <label htmlFor="pos-topic" className="block text-sm font-semibold tracking-wide text-foreground">
                {t('topic')}
              </label>
              <div className="relative">
                <select
                  id="pos-topic"
                  value={posTopic}
                  onChange={(e) => setPosTopic(e.target.value)}
                  className="w-full appearance-none rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                >
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {tc(cat)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stance */}
            <div className="space-y-3">
              <label htmlFor="pos-stance" className="block text-sm font-semibold tracking-wide text-foreground">
                {t('stance')}
              </label>
              <textarea
                id="pos-stance"
                value={posStance}
                onChange={(e) => setPosStance(e.target.value)}
                className="min-h-[100px] w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                maxLength={500}
              />
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <span className="block text-sm font-semibold tracking-wide text-foreground">{t('priority')}</span>
              <div className="flex gap-3">
                {PRIORITIES.map((p) => (
                  <label key={p} className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition-all hover:scale-105 hover:shadow-sm ${
                    posPriority === p
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                      : 'bg-background hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}>
                    <input
                      type="radio"
                      name="position-priority"
                      value={p}
                      checked={posPriority === p}
                      onChange={() => setPosPriority(p)}
                      className="sr-only"
                    />
                    {priorityLabels[p]}
                  </label>
                ))}
              </div>
            </div>

            {/* Key Number */}
            <div className="space-y-3">
              <label htmlFor="pos-key-number" className="block text-sm font-semibold tracking-wide text-foreground">
                {t('keyNumber')}
              </label>
              <input
                id="pos-key-number"
                type="text"
                value={posKeyNumber}
                onChange={(e) => setPosKeyNumber(e.target.value)}
                className="w-full rounded-xl border bg-background px-4 py-3 text-base shadow-sm transition-all placeholder:text-muted-foreground/50 hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
              />
            </div>

            {/* Talking Points */}
            <div className="space-y-3">
              <span className="block text-sm font-semibold tracking-wide text-foreground">{t('talkingPoints')}</span>
              <div className="space-y-3">
                {posTalkingPoints.map((tp, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={tp}
                      onChange={(e) => updateTalkingPoint(i, e.target.value)}
                      className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    {posTalkingPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTalkingPoint(i)}
                        className="rounded-xl px-3 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {posTalkingPoints.length < 10 && (
                <button
                  type="button"
                  onClick={addTalkingPoint}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  + {t('addTalkingPoint')}
                </button>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowPositionModal(false)}
                className="rounded-xl border px-5 py-2.5 text-sm font-medium transition-all hover:bg-muted hover:text-foreground"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                disabled={positionSaving || !posStance.trim()}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:bg-primary/90 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100"
              >
                {positionSaving ? tCommon('loading') : tCommon('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
