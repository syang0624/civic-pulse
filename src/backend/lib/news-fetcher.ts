export interface NewsArticle {
  title: string;
  link: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
}

/** Tries district-specific search first, broadens to region if < 5 results. */
export async function fetchDistrictNews(
  districtName: string,
  regionName: string,
): Promise<NewsArticle[]> {
  const specific = await fetchGoogleNewsRSS(districtName);

  if (specific.length >= 5) {
    return specific.slice(0, 20);
  }

  const broad = await fetchGoogleNewsRSS(regionName);

  const seen = new Set<string>();
  const combined: NewsArticle[] = [];

  for (const article of [...specific, ...broad]) {
    const key = article.title.toLowerCase().slice(0, 40);
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(article);
  }

  return combined.slice(0, 20);
}

async function fetchGoogleNewsRSS(query: string): Promise<NewsArticle[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.error(`Google News RSS returned ${response.status} for query: ${query}`);
      return [];
    }

    const xml = await response.text();
    return parseRSSItems(xml);
  } catch (error) {
    console.error('Failed to fetch Google News RSS:', error);
    return [];
  }
}

function parseRSSItems(xml: string): NewsArticle[] {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];

  return items
    .map((item) => {
      const rawTitle = decodeHTML(
        item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '',
      );
      const link =
        item.match(/<link\/>([\s\S]*?)(?=<)/)?.[1]?.trim() ||
        item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ||
        '';
      const pubDate =
        item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? '';
      const sourceName = decodeHTML(
        item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] ?? '',
      );
      const sourceUrl =
        item.match(/<source\s+url="([^"]*)"/)?.[1] ?? '';

      // Google News RSS titles often end with " - Source Name"
      const title = rawTitle.replace(/\s*-\s*[^-]+$/, '').trim();

      return {
        title,
        link,
        sourceName,
        sourceUrl,
        publishedAt: pubDate
          ? new Date(pubDate).toISOString()
          : new Date().toISOString(),
      };
    })
    .filter((a) => a.title.length > 0);
}

function decodeHTML(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
