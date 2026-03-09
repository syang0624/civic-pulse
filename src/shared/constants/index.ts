import type { IssueCategory, RegionCode } from '@/shared/types';


export const CATEGORY_COLORS: Record<IssueCategory, { bg: string; text: string; hex: string }> = {
  education:   { bg: 'bg-blue-100',    text: 'text-blue-800',    hex: '#3B82F6' },
  housing:     { bg: 'bg-green-100',   text: 'text-green-800',   hex: '#10B981' },
  transport:   { bg: 'bg-yellow-100',  text: 'text-yellow-800',  hex: '#F59E0B' },
  safety:      { bg: 'bg-red-100',     text: 'text-red-800',     hex: '#EF4444' },
  environment: { bg: 'bg-emerald-100', text: 'text-emerald-800', hex: '#059669' },
  economy:     { bg: 'bg-purple-100',  text: 'text-purple-800',  hex: '#8B5CF6' },
  welfare:     { bg: 'bg-pink-100',    text: 'text-pink-800',    hex: '#EC4899' },
  governance:  { bg: 'bg-gray-100',    text: 'text-gray-800',    hex: '#6B7280' },
  healthcare:  { bg: 'bg-teal-100',    text: 'text-teal-800',    hex: '#14B8A6' },
  culture:     { bg: 'bg-orange-100',  text: 'text-orange-800',  hex: '#F97316' },
};

export const CATEGORY_EMOJIS: Record<IssueCategory, string> = {
  education:   '🏫',
  housing:     '🏠',
  transport:   '🚗',
  safety:      '🛡️',
  environment: '🌳',
  economy:     '💼',
  welfare:     '🤝',
  governance:  '🏛️',
  healthcare:  '🏥',
  culture:     '🎭',
};

export const ISSUE_CATEGORIES: IssueCategory[] = [
  'education',
  'housing',
  'transport',
  'safety',
  'environment',
  'economy',
  'welfare',
  'governance',
  'healthcare',
  'culture',
];


export const REGIONS: RegionCode[] = [
  'seoul',
  'busan',
  'daegu',
  'incheon',
  'gwangju',
  'daejeon',
  'ulsan',
  'sejong',
  'gyeonggi',
  'chungbuk',
  'chungnam',
  'jeonbuk',
  'jeonnam',
  'gyeongbuk',
  'gyeongnam',
  'gangwon',
  'jeju',
];

export const PLATFORM_CHAR_LIMITS: Record<string, number> = {
  instagram: 2200,
  facebook: 63206,
  x: 280,
  kakaostory: 2048,
  blog_naver: 50000,
};
