import {
  Document,
  type DocumentProps,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type { ReactElement } from 'react';
import type { Generation, GenerationTool } from '@/shared/types';

interface ExportPdfDocumentProps {
  generation: Generation;
  locale: string;
}

interface AdStructured {
  title?: string;
  content?: string;
  hashtags?: string[];
  image_suggestions?: string[];
}

interface PledgeStructured {
  rank?: number;
  title?: string;
  category?: string;
  problem?: string;
  solution?: string;
  timeline?: string;
  expected_outcomes?: string[];
  talking_points?: string[];
  priority_reason?: string;
  estimated_budget?: string;
}

interface StrategyStructured {
  issue_summary?: string;
  key_voter_groups?: Array<{
    group?: string;
    concern?: string;
    approach?: string;
  }>;
  messaging_angle?: {
    core_message?: string;
    framing?: string;
    tone_recommendation?: string;
  };
  campaign_actions?: Array<{
    action?: string;
    timeline?: string;
    expected_impact?: string;
  }>;
  talking_points?: string[];
  social_media_strategy?: {
    key_hashtags?: string[];
    content_themes?: string[];
    recommended_platforms?: string[];
    post_frequency?: string;
  };
  risks_and_counters?: Array<{
    risk?: string;
    counter?: string;
  }>;
}

function parseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function toDisplayDate(iso: string, locale: string) {
  const resolved = locale === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(resolved, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function toolTitle(tool: GenerationTool, locale: string) {
  if (locale === 'ko') {
    if (tool === 'speech') return '연설문 스크립트';
    if (tool === 'email') return '민원 이메일 답변';
    if (tool === 'ad') return 'SNS 콘텐츠';
    if (tool === 'sentiment') return '주간 민심 브리프';
    if (tool === 'pledge') return '정책 공약';
    return '캠페인 전략 보고서';
  }

  if (tool === 'speech') return 'Speech Script';
  if (tool === 'email') return 'Constituent Email Reply';
  if (tool === 'ad') return 'Social Media Content';
  if (tool === 'sentiment') return 'Weekly Sentiment Brief';
  if (tool === 'pledge') return 'Campaign Pledges';
  return 'Campaign Strategy Report';
}

function sectionLabel(key: string, locale: string) {
  if (locale === 'ko') {
    const labels: Record<string, string> = {
      metadata: '메타데이터',
      tool: '유형',
      locale: '언어',
      generatedAt: '생성일',
      params: '생성 파라미터',
      title: '제목',
      content: '본문',
      hashtags: '해시태그',
      imageSuggestions: '이미지 제안',
      category: '카테고리',
      problem: '문제',
      solution: '해결 방안',
      timeline: '추진 일정',
      outcomes: '기대 효과',
      talkingPoints: '핵심 논점',
      priorityReason: '우선순위 이유',
      budget: '예상 예산',
      issueSummary: '이슈 요약',
      keyVoterGroups: '핵심 유권자 그룹',
      messagingAngle: '메시지 전략',
      campaignActions: '캠페인 행동 계획',
      socialMediaStrategy: '소셜 미디어 전략',
      risksAndCounters: '리스크 및 대응',
      concern: '관심사',
      approach: '접근 방식',
      risk: '리스크',
      counter: '대응',
      frequency: '게시 빈도',
      coreMessage: '핵심 메시지',
      framing: '프레이밍',
      tone: '권장 톤',
      expectedImpact: '기대 영향',
    };
    return labels[key] ?? key;
  }

  const labels: Record<string, string> = {
    metadata: 'Metadata',
    tool: 'Type',
    locale: 'Locale',
    generatedAt: 'Generated',
    params: 'Parameters',
    title: 'Title',
    content: 'Content',
    hashtags: 'Hashtags',
    imageSuggestions: 'Image Suggestions',
    category: 'Category',
    problem: 'Problem',
    solution: 'Solution',
    timeline: 'Timeline',
    outcomes: 'Expected Outcomes',
    talkingPoints: 'Talking Points',
    priorityReason: 'Priority Reason',
    budget: 'Estimated Budget',
    issueSummary: 'Issue Summary',
    keyVoterGroups: 'Key Voter Groups',
    messagingAngle: 'Messaging Angle',
    campaignActions: 'Campaign Actions',
    socialMediaStrategy: 'Social Media Strategy',
    risksAndCounters: 'Risks & Counters',
    concern: 'Concern',
    approach: 'Approach',
    risk: 'Risk',
    counter: 'Counter',
    frequency: 'Post Frequency',
    coreMessage: 'Core Message',
    framing: 'Framing',
    tone: 'Tone Recommendation',
    expectedImpact: 'Expected Impact',
  };
  return labels[key] ?? key;
}

function stringifyParam(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  if (value === undefined || value === null) return '-';
  return String(value);
}

function splitSpeechParagraphs(input: string) {
  if (!input.trim()) {
    return [];
  }

  const byLineBreak = input
    .split(/\n{2,}/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (byLineBreak.length > 1) {
    return byLineBreak;
  }

  return input
    .split(/(?<=[.!?。！？])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#111827',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  brand: {
    fontSize: 10,
    color: '#4B5563',
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    marginTop: 4,
  },
  meta: {
    marginTop: 8,
    fontSize: 9,
    color: '#6B7280',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 6,
    fontWeight: 700,
  },
  paragraph: {
    marginBottom: 8,
  },
  scriptParagraph: {
    marginBottom: 14,
    lineHeight: 1.9,
    fontSize: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 4,
  },
  listItem: {
    marginBottom: 4,
  },
});

function renderSpeech(content: string) {
  const paragraphs = splitSpeechParagraphs(content);
  return (
    <View>
      {paragraphs.length > 0 ? paragraphs.map((paragraph, index) => (
        <Text key={`${paragraph.slice(0, 20)}-${index}`} style={styles.scriptParagraph}>
          {paragraph}
        </Text>
      )) : <Text style={styles.paragraph}>{content}</Text>}
    </View>
  );
}

function renderAd(content: string, locale: string) {
  const ad = parseJson<AdStructured>(content);
  if (!ad) {
    return <Text style={styles.paragraph}>{content}</Text>;
  }

  return (
    <View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{sectionLabel('title', locale)}</Text>
        <Text style={styles.paragraph}>{ad.title ?? '-'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{sectionLabel('content', locale)}</Text>
        <Text style={styles.paragraph}>{ad.content ?? '-'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{sectionLabel('hashtags', locale)}</Text>
        <Text style={styles.paragraph}>
          {(ad.hashtags ?? []).length > 0
            ? (ad.hashtags ?? []).map((tag) => `#${tag}`).join(' ')
            : '-'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{sectionLabel('imageSuggestions', locale)}</Text>
        {(ad.image_suggestions ?? []).length > 0
          ? (ad.image_suggestions ?? []).map((item, index) => (
            <Text key={`${item.slice(0, 20)}-${index}`} style={styles.listItem}>
              {index + 1}. {item}
            </Text>
          ))
          : <Text style={styles.paragraph}>-</Text>}
      </View>
    </View>
  );
}

function renderPledges(content: string, locale: string) {
  const pledges = parseJson<PledgeStructured[]>(content);
  if (!Array.isArray(pledges) || pledges.length === 0) {
    return <Text style={styles.paragraph}>{content}</Text>;
  }

  return (
    <View>
      {pledges.map((pledge, index) => (
        <View key={`${pledge.title ?? 'pledge'}-${index}`} style={styles.card}>
          <Text style={styles.cardTitle}>
            {`${pledge.rank ?? index + 1}. ${pledge.title ?? '-'}`}
          </Text>
          <Text style={styles.paragraph}>{sectionLabel('category', locale)}: {pledge.category ?? '-'}</Text>
          <Text style={styles.paragraph}>{sectionLabel('problem', locale)}: {pledge.problem ?? '-'}</Text>
          <Text style={styles.paragraph}>{sectionLabel('solution', locale)}: {pledge.solution ?? '-'}</Text>
          <Text style={styles.paragraph}>{sectionLabel('timeline', locale)}: {pledge.timeline ?? '-'}</Text>
          <Text style={styles.paragraph}>{sectionLabel('budget', locale)}: {pledge.estimated_budget ?? '-'}</Text>
          <Text style={styles.sectionTitle}>{sectionLabel('outcomes', locale)}</Text>
          {(pledge.expected_outcomes ?? []).length > 0
            ? (pledge.expected_outcomes ?? []).map((item, i) => (
              <Text key={`${item.slice(0, 20)}-${i}`} style={styles.listItem}>• {item}</Text>
            ))
            : <Text style={styles.paragraph}>-</Text>}
          <Text style={styles.sectionTitle}>{sectionLabel('talkingPoints', locale)}</Text>
          {(pledge.talking_points ?? []).length > 0
            ? (pledge.talking_points ?? []).map((item, i) => (
              <Text key={`${item.slice(0, 20)}-${i}`} style={styles.listItem}>• {item}</Text>
            ))
            : <Text style={styles.paragraph}>-</Text>}
          <Text style={styles.paragraph}>{sectionLabel('priorityReason', locale)}: {pledge.priority_reason ?? '-'}</Text>
        </View>
      ))}
    </View>
  );
}

function renderStrategy(content: string, locale: string) {
  const strategy = parseJson<StrategyStructured>(content);
  if (!strategy) {
    return <Text style={styles.paragraph}>{content}</Text>;
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('issueSummary', locale)}</Text>
        <Text style={styles.paragraph}>{strategy.issue_summary ?? '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('keyVoterGroups', locale)}</Text>
        {(strategy.key_voter_groups ?? []).length > 0
          ? (strategy.key_voter_groups ?? []).map((group, index) => (
            <Text key={`${group.group ?? 'group'}-${index}`} style={styles.listItem}>
              {index + 1}. {(group.group ?? '-')} | {sectionLabel('concern', locale)}: {(group.concern ?? '-')} | {sectionLabel('approach', locale)}: {(group.approach ?? '-')}
            </Text>
          ))
          : <Text style={styles.paragraph}>-</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('messagingAngle', locale)}</Text>
        <Text style={styles.paragraph}>{sectionLabel('coreMessage', locale)}: {strategy.messaging_angle?.core_message ?? '-'}</Text>
        <Text style={styles.paragraph}>{sectionLabel('framing', locale)}: {strategy.messaging_angle?.framing ?? '-'}</Text>
        <Text style={styles.paragraph}>{sectionLabel('tone', locale)}: {strategy.messaging_angle?.tone_recommendation ?? '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('campaignActions', locale)}</Text>
        {(strategy.campaign_actions ?? []).length > 0
          ? (strategy.campaign_actions ?? []).map((action, index) => (
            <Text key={`${action.action ?? 'action'}-${index}`} style={styles.listItem}>
              {index + 1}. {action.action ?? '-'} ({action.timeline ?? '-'}) — {sectionLabel('expectedImpact', locale)}: {action.expected_impact ?? '-'}
            </Text>
          ))
          : <Text style={styles.paragraph}>-</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('talkingPoints', locale)}</Text>
        {(strategy.talking_points ?? []).length > 0
          ? (strategy.talking_points ?? []).map((item, index) => (
            <Text key={`${item.slice(0, 20)}-${index}`} style={styles.listItem}>{index + 1}. {item}</Text>
          ))
          : <Text style={styles.paragraph}>-</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('socialMediaStrategy', locale)}</Text>
        <Text style={styles.paragraph}>#{(strategy.social_media_strategy?.key_hashtags ?? []).join(' #') || '-'}</Text>
        <Text style={styles.paragraph}>Themes: {(strategy.social_media_strategy?.content_themes ?? []).join(', ') || '-'}</Text>
        <Text style={styles.paragraph}>Platforms: {(strategy.social_media_strategy?.recommended_platforms ?? []).join(', ') || '-'}</Text>
        <Text style={styles.paragraph}>{sectionLabel('frequency', locale)}: {strategy.social_media_strategy?.post_frequency ?? '-'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{sectionLabel('risksAndCounters', locale)}</Text>
        {(strategy.risks_and_counters ?? []).length > 0
          ? (strategy.risks_and_counters ?? []).map((item, index) => (
            <Text key={`${item.risk ?? 'risk'}-${index}`} style={styles.listItem}>
              {index + 1}. {sectionLabel('risk', locale)}: {item.risk ?? '-'} / {sectionLabel('counter', locale)}: {item.counter ?? '-'}
            </Text>
          ))
          : <Text style={styles.paragraph}>-</Text>}
      </View>
    </View>
  );
}

function renderSentiment(content: string) {
  const sentiment = parseJson<{
    period?: string;
    top_trending_up?: string[];
    top_trending_down?: string[];
    new_issues?: string[];
    negative_hotspots?: string[];
    recommended_actions?: string[];
  }>(content);

  if (!sentiment) {
    return <Text style={styles.paragraph}>{content}</Text>;
  }

  return (
    <View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Period</Text>
        <Text style={styles.paragraph}>{sentiment.period ?? '-'}</Text>
      </View>

      {[
        { title: 'Trending Up', items: sentiment.top_trending_up },
        { title: 'Trending Down', items: sentiment.top_trending_down },
        { title: 'New Issues', items: sentiment.new_issues },
        { title: 'Negative Hotspots', items: sentiment.negative_hotspots },
        { title: 'Recommended Actions', items: sentiment.recommended_actions },
      ].map(({ title, items }) => {
        const list: string[] = Array.isArray(items) ? items : [];
        return (
          <View style={styles.section} key={title}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {list.length > 0
              ? list.map((item: string, index: number) => (
                <Text key={`${title}-${index}`} style={styles.listItem}>• {item}</Text>
              ))
              : <Text style={styles.paragraph}>-</Text>}
          </View>
        );
      })}
    </View>
  );
}

export function createExportPdfDocument({ generation, locale }: ExportPdfDocumentProps): ReactElement<DocumentProps> {
  const content = generation.edited_text?.trim() || generation.output_text;
  const date = toDisplayDate(generation.created_at, locale);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>CIVIC PULSE</Text>
          <Text style={styles.title}>{toolTitle(generation.tool, locale)}</Text>
          <Text style={styles.meta}>
            {sectionLabel('generatedAt', locale)}: {date} · {sectionLabel('tool', locale)}: {generation.tool.toUpperCase()} · {sectionLabel('locale', locale)}: {generation.locale.toUpperCase()}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{sectionLabel('params', locale)}</Text>
          {Object.entries(generation.input_params).length > 0
            ? Object.entries(generation.input_params).map(([key, value]) => (
              <Text key={key} style={styles.listItem}>{key}: {stringifyParam(value)}</Text>
            ))
            : <Text style={styles.paragraph}>-</Text>}
        </View>

        {(generation.tool === 'speech' || generation.tool === 'email') && renderSpeech(content)}
        {generation.tool === 'ad' && renderAd(content, locale)}
        {generation.tool === 'sentiment' && renderSentiment(content)}
        {generation.tool === 'pledge' && renderPledges(content, locale)}
        {generation.tool === 'strategy' && renderStrategy(content, locale)}
      </Page>
    </Document>
  );
}
