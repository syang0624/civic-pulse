interface MinutesItem {
  docId: string;
  councilName: string;
  meetingDate: string;
  meetingName: string;
  agendaSubject?: string;
}

interface MinutesApiResponse {
  SERVICE: string;
  RESULT_CODE: string;
  TOTAL_COUNT: number;
  LIST_COUNT: number;
  LIST: Array<{
    ROW: {
      DOCID: string;
      RASMBLY_NM: string;
      MTG_DE: string;
      MTGNM: string;
      MTR_SJ?: string;
    };
  }>;
}

const CLIK_API_BASE = 'https://clik.nanet.go.kr/openapi/minutes.do';

export async function searchCouncilMinutes(
  keyword: string,
  maxResults = 5,
): Promise<MinutesItem[]> {
  const apiKey = process.env.CLIK_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({
      key: apiKey,
      type: 'json',
      displayType: 'list',
      startCount: '0',
      listCount: String(maxResults),
      searchType: 'ALL',
      searchKeyword: keyword,
    });

    const res = await fetch(`${CLIK_API_BASE}?${params}`, {
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return [];

    const raw = await res.json();
    const data = (Array.isArray(raw) ? raw[0] : raw) as MinutesApiResponse;

    if (data.RESULT_CODE !== 'SUCCESS' || !data.LIST) return [];

    return data.LIST.map((entry) => ({
      docId: entry.ROW.DOCID,
      councilName: entry.ROW.RASMBLY_NM,
      meetingDate: entry.ROW.MTG_DE,
      meetingName: entry.ROW.MTGNM,
      agendaSubject: entry.ROW.MTR_SJ,
    }));
  } catch {
    return [];
  }
}

export function formatMinutesContext(items: MinutesItem[]): string | null {
  if (items.length === 0) return null;

  return items
    .map(
      (m) =>
        `- [${m.councilName}] ${m.meetingDate} ${m.meetingName}${m.agendaSubject ? `: ${m.agendaSubject}` : ''}`,
    )
    .join('\n');
}
