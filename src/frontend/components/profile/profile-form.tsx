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
    <div className="space-y-8">
      {/* Feedback banner */}
      {feedback && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* ── Basic Info ── */}
      <section className="space-y-6">
        <h2 className="text-lg font-semibold">{t('basicInfo')}</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="profile-name" className="text-sm font-medium">
              {t('name')}
            </label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={100}
            />
          </div>

          {/* Party */}
          <div className="space-y-2">
            <label htmlFor="profile-party" className="text-sm font-medium">
              {t('party')}
            </label>
            <input
              id="profile-party"
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder={t('partyIndependent')}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="profile-district-code"
              className="text-sm font-medium"
            >
              {t('districtCode')}
            </label>
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
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
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

          {hasSubDistricts && (
            <div className="space-y-2">
              <label
                htmlFor="profile-district-name"
                className="text-sm font-medium"
              >
                {t('districtName')}
              </label>
              <select
                id="profile-district-name"
                value={districtName}
                onChange={(e) => setDistrictName(e.target.value)}
                disabled={!districtCode}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">{t('selectDistrict')}</option>
                {selectedDistricts.map((district) => (
                  <option key={district.name} value={district.name}>
                    {languageKey === 'ko' ? district.name : `${district.nameEn} (${district.name})`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2 sm:col-span-2">
            <span className="text-sm font-medium">
              {t('electionType')}
            </span>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {ELECTION_TYPES.map((type) => {
                const isEnabled = enabledElectionTypes.includes(type);

                return (
                  <label
                    key={type}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      isEnabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="profile-election-type"
                      value={type}
                      checked={electionType === type}
                      onChange={() => setElectionType(type)}
                      disabled={!isEnabled}
                      className="accent-primary"
                    />
                    {t(ELECTION_TYPE_I18N_KEYS[type])}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Background */}
        <div className="space-y-2">
          <label htmlFor="profile-background" className="text-sm font-medium">
            {t('background')}
          </label>
          <textarea
            id="profile-background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
            className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {t('backgroundHelper')}
          </p>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <label htmlFor="profile-tone" className="text-sm font-medium">
            {t('tone')}
          </label>
          <select
            id="profile-tone"
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {TONES.map((toneValue) => (
              <option key={toneValue} value={toneValue}>
                {toneLabels[toneValue]}
              </option>
            ))}
          </select>
        </div>

        {/* Target Demographics */}
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('targetDemo')}</span>
          <div className="flex flex-wrap gap-2">
            {DEMOGRAPHICS.map((demo) => (
              <label
                key={demo}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  targetDemo.includes(demo)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
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
        <div className="space-y-2">
          <span className="text-sm font-medium">{t('language')}</span>
          <div className="flex gap-2">
            {(['ko', 'en'] as const).map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setLocale(loc)}
                className={`rounded-md border px-4 py-2 text-sm transition-colors ${
                  locale === loc
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {loc === 'ko' ? '한국어' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSaveProfile}
          disabled={saving}
          className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? tCommon('loading') : tCommon('save')}
        </button>
      </section>

      {/* ── Divider ── */}
      <hr className="border-border" />

      {/* ── Policy Positions ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('positions')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('positionsSubtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={openAddPosition}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('addPosition')}
          </button>
        </div>

        {/* Position cards */}
        {positions.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-muted-foreground">{t('noPositions')}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {positions.map((pos) => (
              <div key={pos.id} className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {tc(pos.topic)}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          pos.priority === 'high'
                            ? 'bg-red-100 text-red-800'
                            : pos.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {priorityLabels[pos.priority]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pos.stance}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => openEditPosition(pos)}
                      className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {tCommon('edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePosition(pos.id)}
                      className="rounded-md px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>

                {pos.key_number && (
                  <p className="text-sm">
                    <span className="font-medium">{t('keyNumber')}:</span>{' '}
                    {pos.key_number}
                  </p>
                )}

                {pos.talking_points.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('talkingPoints')}
                    </span>
                    <ul className="list-inside list-disc space-y-0.5 text-sm">
                      {pos.talking_points.map((tp, i) => (
                        <li key={i}>{tp}</li>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              {editingPosition ? t('editPosition') : t('addPosition')}
            </h3>

            {/* Topic */}
            <div className="space-y-2">
              <label htmlFor="pos-topic" className="text-sm font-medium">
                {t('topic')}
              </label>
              <select
                id="pos-topic"
                value={posTopic}
                onChange={(e) => setPosTopic(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {ISSUE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {tc(cat)}
                  </option>
                ))}
              </select>
            </div>

            {/* Stance */}
            <div className="space-y-2">
              <label htmlFor="pos-stance" className="text-sm font-medium">
                {t('stance')}
              </label>
              <textarea
                id="pos-stance"
                value={posStance}
                onChange={(e) => setPosStance(e.target.value)}
                className="min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('priority')}</span>
              <div className="flex gap-4">
                {PRIORITIES.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="position-priority"
                      value={p}
                      checked={posPriority === p}
                      onChange={() => setPosPriority(p)}
                      className="accent-primary"
                    />
                    {priorityLabels[p]}
                  </label>
                ))}
              </div>
            </div>

            {/* Key Number */}
            <div className="space-y-2">
              <label htmlFor="pos-key-number" className="text-sm font-medium">
                {t('keyNumber')}
              </label>
              <input
                id="pos-key-number"
                type="text"
                value={posKeyNumber}
                onChange={(e) => setPosKeyNumber(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {/* Talking Points */}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t('talkingPoints')}</span>
              <div className="space-y-2">
                {posTalkingPoints.map((tp, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={tp}
                      onChange={(e) => updateTalkingPoint(i, e.target.value)}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                    />
                    {posTalkingPoints.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTalkingPoint(i)}
                        className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent"
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
                  className="text-sm text-primary hover:underline"
                >
                  + {t('addTalkingPoint')}
                </button>
              )}
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPositionModal(false)}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                disabled={positionSaving || !posStance.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
