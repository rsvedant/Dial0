export type SearchResult = {
  title: string;
  link: string;
  snippet?: string;
};

export async function googleProgrammableSearch(query: string, opts?: { num?: number }): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_SEARCH_API_KEY;
  const cx = process.env.GOOGLE_SEARCH_CX;
  const num = Math.min(Math.max(opts?.num ?? 5, 1), 10);
  if (!key || !cx) return [];
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', query);
  url.searchParams.set('num', String(num));

  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = await res.json();
  const items = (json.items ?? []) as any[];
  return items.map((it) => ({ title: it.title, link: it.link, snippet: it.snippet }));
}
