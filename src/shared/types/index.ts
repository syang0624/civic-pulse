// ============================================================
// Civic Pulse — Shared Type Definitions
// ============================================================

// --- Locale ---

export type Locale = 'ko' | 'en';

// --- Enums as union types ---

export type Tone = 'formal' | 'conversational' | 'passionate' | 'data_driven';
export type Priority = 'high' | 'medium' | 'low';
export type Urgency = 'high' | 'medium' | 'low';
export type Trend = 'rising' | 'stable' | 'declining';
export type GenerationTool = 'speech' | 'ad' | 'pledge' | 'strategy';

export type IssueCategory =
  | 'education'
  | 'housing'
  | 'transport'
  | 'safety'
  | 'environment'
  | 'economy'
  | 'welfare'
  | 'governance'
  | 'healthcare'
  | 'culture';

export type Demographic =
  | 'youth'
  | 'elderly'
  | 'families'
  | 'businessOwners'
  | 'workers'
  | 'students';

export type SpeechOccasion =
  | 'campaign_rally'
  | 'debate'
  | 'town_hall'
  | 'press_conference'
  | 'online_video';

export type SpeechLength = '3min' | '5min' | '10min';
export type DataLevel = 'light' | 'medium' | 'heavy';

export type AdPlatform =
  | 'instagram'
  | 'facebook'
  | 'x'
  | 'kakaostory'
  | 'blog_naver';

export type AdGoal =
  | 'awareness'
  | 'event_promotion'
  | 'position_statement'
  | 'call_to_action';

// --- Profile ---

export interface Profile {
  id: string;
  name: string;
  district_code: string;
  district_name: string;
  election_type: string;
  party: string;
  background: string | null;
  tone: Tone;
  target_demo: Demographic[];
  locale: Locale;
  created_at: string;
  updated_at: string;
}

export interface ProfileWithPositions extends Profile {
  positions: PolicyPosition[];
}

// --- Policy Position ---

export interface PolicyPosition {
  id: string;
  profile_id: string;
  topic: string;
  stance: string;
  priority: Priority;
  key_number: string | null;
  talking_points: string[];
  created_at: string;
  updated_at: string;
}

// --- Issue Source ---

export interface IssueSource {
  url: string;
  name: string;
  title: string;
  published_at: string;
}

// --- Issue ---

export interface Issue {
  id: string;
  title_ko: string;
  title_en: string | null;
  category: IssueCategory;
  subcategory: string | null;
  description_ko: string | null;
  description_en: string | null;
  region_code: string;
  sub_region: string | null;
  latitude: number | null;
  longitude: number | null;
  sentiment: number | null;
  urgency: Urgency;
  trend: Trend;
  mention_count: number;
  first_seen: string;
  last_seen: string;
  source_session: string | null;
  created_at: string;
}

export interface IssueDisplay {
  id: string;
  title: string;
  category: IssueCategory;
  subcategory: string | null;
  description: string | null;
  region_code: string;
  sub_region: string | null;
  sentiment: number | null;
  urgency: Urgency;
  trend: Trend;
  mention_count: number;
  first_seen: string;
  last_seen: string;
  translated: boolean;
  sources: IssueSource[];
}

// --- Generation ---

export interface Generation {
  id: string;
  profile_id: string;
  tool: GenerationTool;
  input_params: Record<string, unknown>;
  context_used: ContextUsed;
  output_text: string;
  user_edited: boolean;
  edited_text: string | null;
  locale: Locale;
  created_at: string;
}

export interface ContextUsed {
  profile_fields: string[];
  issues_referenced: string[];
}

// --- Generation Request Types ---

export interface SpeechGenerationRequest {
  topic: string;
  occasion: SpeechOccasion;
  tone?: Tone;
  length: SpeechLength | number;
  data_level?: DataLevel;
  issue_id?: string;
}

export interface AdGenerationRequest {
  platform: AdPlatform;
  topic: string;
  goal: AdGoal;
  issue_id?: string;
}

export interface PledgeGenerationRequest {
  focus_areas: string[];
  num_pledges: number;
  region_context?: string;
}

export interface StrategyGenerationRequest {
  issue_id: string;
  focus?: string;
}

// --- Context Assembly ---

export interface ContextPackage {
  profile: {
    name: string;
    district_name: string;
    election_type: string;
    party: string;
    background: string | null;
    tone: Tone;
    target_demo: Demographic[];
  };
  positions: {
    topic: string;
    stance: string;
    priority: Priority;
    key_number: string | null;
    talking_points: string[];
  }[];
  issues: {
    title: string;
    category: IssueCategory;
    description: string | null;
    sentiment: number | null;
    urgency: Urgency;
    mention_count: number;
    sub_region: string | null;
    last_seen: string;
  }[];
  locale: Locale;
}

// --- API Response Types ---

export interface ApiError {
  error: string;
  code: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
