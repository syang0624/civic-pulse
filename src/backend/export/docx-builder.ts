import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { Generation, GenerationTool } from '@/shared/types';

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

function isKorean(locale: string) {
  return locale === 'ko' || locale.startsWith('ko-');
}

function toolTitle(tool: GenerationTool, locale: string) {
  if (isKorean(locale)) {
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

function label(key: string, locale: string) {
  if (isKorean(locale)) {
    const labels: Record<string, string> = {
      generatedAt: '생성일',
      tool: '유형',
      locale: '언어',
      parameters: '생성 파라미터',
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
      coreMessage: '핵심 메시지',
      framing: '프레이밍',
      tone: '권장 톤',
      expectedImpact: '기대 영향',
      postFrequency: '게시 빈도',
      risk: '리스크',
      counter: '대응',
    };
    return labels[key] ?? key;
  }

  const labels: Record<string, string> = {
    generatedAt: 'Generated',
    tool: 'Type',
    locale: 'Locale',
    parameters: 'Parameters',
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
    coreMessage: 'Core Message',
    framing: 'Framing',
    tone: 'Tone Recommendation',
    expectedImpact: 'Expected Impact',
    postFrequency: 'Post Frequency',
    risk: 'Risk',
    counter: 'Counter',
  };
  return labels[key] ?? key;
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(isKorean(locale) ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function stringifyParam(value: unknown) {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  if (value === null || value === undefined) return '-';
  return String(value);
}

function sectionHeading(text: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true })],
  });
}

function bodyParagraph(text: string, spacingAfter = 120) {
  return new Paragraph({
    spacing: { after: spacingAfter, line: 360 },
    children: [new TextRun(text || '-')],
  });
}

function speechParagraphs(text: string) {
  const byBlock = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const segments = byBlock.length > 1
    ? byBlock
    : text.split(/(?<=[.!?。！？])\s+/).map((part) => part.trim()).filter(Boolean);

  if (segments.length === 0) {
    return [bodyParagraph(text)];
  }

  return segments.map((segment) => bodyParagraph(segment, 220));
}

function appendMetadata(paragraphs: Paragraph[], generation: Generation, locale: string) {
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
      children: [new TextRun({ text: toolTitle(generation.tool, locale), bold: true })],
    }),
  );

  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
      children: [
        new TextRun({
          text: `${label('generatedAt', locale)}: ${formatDate(generation.created_at, locale)} · ${label('tool', locale)}: ${generation.tool.toUpperCase()} · ${label('locale', locale)}: ${generation.locale.toUpperCase()}`,
          color: '6B7280',
          size: 18,
        }),
      ],
    }),
  );

  paragraphs.push(sectionHeading(label('parameters', locale)));
  const entries = Object.entries(generation.input_params);
  if (entries.length === 0) {
    paragraphs.push(bodyParagraph('-'));
    return;
  }

  entries.forEach(([key, value]) => {
    paragraphs.push(bodyParagraph(`${key}: ${stringifyParam(value)}`, 80));
  });
}

function appendSpeech(paragraphs: Paragraph[], content: string) {
  paragraphs.push(...speechParagraphs(content));
}

function appendAd(paragraphs: Paragraph[], content: string, locale: string) {
  const ad = parseJson<AdStructured>(content);
  if (!ad) {
    paragraphs.push(bodyParagraph(content));
    return;
  }

  paragraphs.push(sectionHeading(label('title', locale)));
  paragraphs.push(bodyParagraph(ad.title ?? '-'));

  paragraphs.push(sectionHeading(label('content', locale)));
  paragraphs.push(bodyParagraph(ad.content ?? '-'));

  paragraphs.push(sectionHeading(label('hashtags', locale)));
  paragraphs.push(bodyParagraph((ad.hashtags ?? []).length > 0 ? (ad.hashtags ?? []).map((tag) => `#${tag}`).join(' ') : '-'));

  paragraphs.push(sectionHeading(label('imageSuggestions', locale)));
  if ((ad.image_suggestions ?? []).length === 0) {
    paragraphs.push(bodyParagraph('-'));
    return;
  }
  (ad.image_suggestions ?? []).forEach((item, index) => {
    paragraphs.push(bodyParagraph(`${index + 1}. ${item}`, 80));
  });
}

function appendPledges(paragraphs: Paragraph[], content: string, locale: string) {
  const pledges = parseJson<PledgeStructured[]>(content);
  if (!Array.isArray(pledges) || pledges.length === 0) {
    paragraphs.push(bodyParagraph(content));
    return;
  }

  pledges.forEach((pledge, index) => {
    paragraphs.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 220, after: 100 },
        children: [
          new TextRun({
            text: `${pledge.rank ?? index + 1}. ${pledge.title ?? '-'}`,
            bold: true,
          }),
        ],
      }),
    );

    paragraphs.push(bodyParagraph(`${label('category', locale)}: ${pledge.category ?? '-'}`, 80));
    paragraphs.push(bodyParagraph(`${label('problem', locale)}: ${pledge.problem ?? '-'}`, 80));
    paragraphs.push(bodyParagraph(`${label('solution', locale)}: ${pledge.solution ?? '-'}`, 80));
    paragraphs.push(bodyParagraph(`${label('timeline', locale)}: ${pledge.timeline ?? '-'}`, 80));
    paragraphs.push(bodyParagraph(`${label('budget', locale)}: ${pledge.estimated_budget ?? '-'}`, 80));

    paragraphs.push(sectionHeading(label('outcomes', locale)));
    if ((pledge.expected_outcomes ?? []).length > 0) {
      (pledge.expected_outcomes ?? []).forEach((item) => {
        paragraphs.push(bodyParagraph(`• ${item}`, 80));
      });
    } else {
      paragraphs.push(bodyParagraph('-', 80));
    }

    paragraphs.push(sectionHeading(label('talkingPoints', locale)));
    if ((pledge.talking_points ?? []).length > 0) {
      (pledge.talking_points ?? []).forEach((item) => {
        paragraphs.push(bodyParagraph(`• ${item}`, 80));
      });
    } else {
      paragraphs.push(bodyParagraph('-', 80));
    }

    paragraphs.push(bodyParagraph(`${label('priorityReason', locale)}: ${pledge.priority_reason ?? '-'}`, 120));
  });
}

function appendStrategy(paragraphs: Paragraph[], content: string, locale: string) {
  const strategy = parseJson<StrategyStructured>(content);
  if (!strategy) {
    paragraphs.push(bodyParagraph(content));
    return;
  }

  paragraphs.push(sectionHeading(label('issueSummary', locale)));
  paragraphs.push(bodyParagraph(strategy.issue_summary ?? '-'));

  paragraphs.push(sectionHeading(label('keyVoterGroups', locale)));
  if ((strategy.key_voter_groups ?? []).length > 0) {
    (strategy.key_voter_groups ?? []).forEach((group, index) => {
      paragraphs.push(
        bodyParagraph(
          `${index + 1}. ${group.group ?? '-'} | ${label('concern', locale)}: ${group.concern ?? '-'} | ${label('approach', locale)}: ${group.approach ?? '-'}`,
          80,
        ),
      );
    });
  } else {
    paragraphs.push(bodyParagraph('-'));
  }

  paragraphs.push(sectionHeading(label('messagingAngle', locale)));
  paragraphs.push(bodyParagraph(`${label('coreMessage', locale)}: ${strategy.messaging_angle?.core_message ?? '-'}`, 80));
  paragraphs.push(bodyParagraph(`${label('framing', locale)}: ${strategy.messaging_angle?.framing ?? '-'}`, 80));
  paragraphs.push(bodyParagraph(`${label('tone', locale)}: ${strategy.messaging_angle?.tone_recommendation ?? '-'}`, 120));

  paragraphs.push(sectionHeading(label('campaignActions', locale)));
  if ((strategy.campaign_actions ?? []).length > 0) {
    (strategy.campaign_actions ?? []).forEach((action, index) => {
      paragraphs.push(
        bodyParagraph(
          `${index + 1}. ${action.action ?? '-'} (${action.timeline ?? '-'}) - ${label('expectedImpact', locale)}: ${action.expected_impact ?? '-'}`,
          80,
        ),
      );
    });
  } else {
    paragraphs.push(bodyParagraph('-'));
  }

  paragraphs.push(sectionHeading(label('talkingPoints', locale)));
  if ((strategy.talking_points ?? []).length > 0) {
    (strategy.talking_points ?? []).forEach((point, index) => {
      paragraphs.push(bodyParagraph(`${index + 1}. ${point}`, 80));
    });
  } else {
    paragraphs.push(bodyParagraph('-'));
  }

  paragraphs.push(sectionHeading(label('socialMediaStrategy', locale)));
  paragraphs.push(bodyParagraph(`Hashtags: ${(strategy.social_media_strategy?.key_hashtags ?? []).map((tag) => `#${tag}`).join(' ') || '-'}`, 80));
  paragraphs.push(bodyParagraph(`Themes: ${(strategy.social_media_strategy?.content_themes ?? []).join(', ') || '-'}`, 80));
  paragraphs.push(bodyParagraph(`Platforms: ${(strategy.social_media_strategy?.recommended_platforms ?? []).join(', ') || '-'}`, 80));
  paragraphs.push(bodyParagraph(`${label('postFrequency', locale)}: ${strategy.social_media_strategy?.post_frequency ?? '-'}`, 120));

  paragraphs.push(sectionHeading(label('risksAndCounters', locale)));
  if ((strategy.risks_and_counters ?? []).length > 0) {
    (strategy.risks_and_counters ?? []).forEach((item, index) => {
      paragraphs.push(bodyParagraph(`${index + 1}. ${label('risk', locale)}: ${item.risk ?? '-'} / ${label('counter', locale)}: ${item.counter ?? '-'}`, 80));
    });
  } else {
    paragraphs.push(bodyParagraph('-'));
  }
}

function appendSentiment(paragraphs: Paragraph[], content: string) {
  const sentiment = parseJson<{
    period?: string;
    top_trending_up?: string[];
    top_trending_down?: string[];
    new_issues?: string[];
    negative_hotspots?: string[];
    recommended_actions?: string[];
  }>(content);

  if (!sentiment) {
    paragraphs.push(bodyParagraph(content));
    return;
  }

  paragraphs.push(sectionHeading('Period'));
  paragraphs.push(bodyParagraph(sentiment.period ?? '-'));

  const sections: Array<[string, string[] | undefined]> = [
    ['Trending Up', sentiment.top_trending_up],
    ['Trending Down', sentiment.top_trending_down],
    ['New Issues', sentiment.new_issues],
    ['Negative Hotspots', sentiment.negative_hotspots],
    ['Recommended Actions', sentiment.recommended_actions],
  ];

  sections.forEach(([title, items]) => {
    paragraphs.push(sectionHeading(title));
    if ((items ?? []).length === 0) {
      paragraphs.push(bodyParagraph('-'));
      return;
    }
    (items ?? []).forEach((item) => {
      paragraphs.push(bodyParagraph(`• ${item}`, 80));
    });
  });
}

export async function buildDocx(generation: Generation, locale: string): Promise<Buffer> {
  const content = generation.edited_text?.trim() || generation.output_text;
  const paragraphs: Paragraph[] = [];

  appendMetadata(paragraphs, generation, locale);

  if (generation.tool === 'speech' || generation.tool === 'email') {
    appendSpeech(paragraphs, content);
  } else if (generation.tool === 'ad') {
    appendAd(paragraphs, content, locale);
  } else if (generation.tool === 'sentiment') {
    appendSentiment(paragraphs, content);
  } else if (generation.tool === 'pledge') {
    appendPledges(paragraphs, content, locale);
  } else {
    appendStrategy(paragraphs, content, locale);
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
