import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SearchResult {
  source: string;
  title: string;
  snippet: string;
  url: string;
}

// Wikipedia API (free, no key needed)
async function searchWikipedia(query: string, lang = "pt"): Promise<SearchResult[]> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&utf8=1&srprop=snippet`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0 (scholarly research)" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.query?.search || []).map((item: any) => ({
      source: `Wikipedia (${lang})`,
      title: item.title,
      snippet: item.snippet.replace(/<[^>]+>/g, "").substring(0, 500),
      url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
    }));
  } catch (e) {
    console.error("Wikipedia search error:", e);
    return [];
  }
}

// Wikipedia extract (get full summary for a page)
async function getWikipediaExtract(title: string, lang = "pt"): Promise<string> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(title)}&format=json&utf8=1`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0 (scholarly research)" },
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0] as any;
    return page?.extract?.substring(0, 1500) || "";
  } catch {
    return "";
  }
}

// arXiv API (free, no key needed) — good for theology/philosophy papers
async function searchArxiv(query: string): Promise<SearchResult[]> {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=3`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0 (scholarly research)" },
    });
    if (!resp.ok) return [];
    const xml = await resp.text();
    const results: SearchResult[] = [];
    const entries = xml.split("<entry>");
    for (let i = 1; i < entries.length && i <= 3; i++) {
      const entry = entries[i];
      const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim().replace(/\n/g, " ") || "";
      const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1]?.trim().replace(/\n/g, " ").substring(0, 400) || "";
      const link = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() || "";
      if (title) {
        results.push({ source: "arXiv", title, snippet: summary, url: link });
      }
    }
    return results;
  } catch (e) {
    console.error("arXiv search error:", e);
    return [];
  }
}

// SciELO API (free, no key needed) — Brazilian academic articles
async function searchScielo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://search.scielo.org/?q=${encodeURIComponent(query)}&lang=pt&count=3&output=json&from=0`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0 (scholarly research)" },
    });
    if (!resp.ok) return [];
    
    // SciELO returns HTML, try alternative API
    const articleMetaUrl = `https://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(query)}&limit=3`;
    const resp2 = await fetch(articleMetaUrl, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0" },
    });
    if (!resp2.ok) return [];
    const data = await resp2.json();
    
    return (data.objects || []).slice(0, 3).map((item: any) => {
      const title = item.title || item.original_title || "Artigo SciELO";
      return {
        source: "SciELO",
        title: typeof title === 'object' ? (title.pt || title.en || Object.values(title)[0] || "Artigo") : title,
        snippet: (item.abstract?.pt || item.abstract?.en || "").substring(0, 400),
        url: item.doi ? `https://doi.org/${item.doi}` : `https://www.scielo.br/`,
      };
    });
  } catch (e) {
    console.error("SciELO search error:", e);
    return [];
  }
}

// ERIC API (free, no key needed) — education research
async function searchEric(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.ies.ed.gov/eric/?search=${encodeURIComponent(query)}&rows=3&format=json`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.response?.docs || []).map((doc: any) => ({
      source: "ERIC",
      title: doc.title || "Artigo ERIC",
      snippet: (doc.description || "").substring(0, 400),
      url: doc.url || `https://eric.ed.gov/?id=${doc.id}`,
    }));
  } catch (e) {
    console.error("ERIC search error:", e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, sources } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const enabledSources = sources || ["wikipedia_pt", "wikipedia_en", "arxiv", "scielo"];
    
    const promises: Promise<SearchResult[]>[] = [];

    if (enabledSources.includes("wikipedia_pt")) {
      promises.push(searchWikipedia(query, "pt"));
    }
    if (enabledSources.includes("wikipedia_en")) {
      promises.push(searchWikipedia(query, "en"));
    }
    if (enabledSources.includes("arxiv")) {
      promises.push(searchArxiv(query));
    }
    if (enabledSources.includes("scielo")) {
      promises.push(searchScielo(query));
    }
    if (enabledSources.includes("eric")) {
      promises.push(searchEric(query));
    }

    const results = (await Promise.all(promises)).flat();

    // Get Wikipedia extracts for top results
    const wikiResults = results.filter(r => r.source.startsWith("Wikipedia"));
    const extracts: Record<string, string> = {};
    
    if (wikiResults.length > 0) {
      const extractPromises = wikiResults.slice(0, 2).map(async (r) => {
        const lang = r.source.includes("en") ? "en" : "pt";
        const extract = await getWikipediaExtract(r.title, lang);
        if (extract) extracts[r.title] = extract;
      });
      await Promise.all(extractPromises);
    }

    // Build enriched context string
    let contextString = "";
    if (results.length > 0) {
      contextString = "\n\n## 🌐 FONTES EXTERNAS (Pesquisa Acadêmica):\n";
      for (const r of results) {
        contextString += `\n### ${r.source}: ${r.title}\n`;
        if (extracts[r.title]) {
          contextString += `${extracts[r.title]}\n`;
        } else if (r.snippet) {
          contextString += `${r.snippet}\n`;
        }
        contextString += `🔗 ${r.url}\n`;
      }
      contextString += `\n**INSTRUÇÃO:** Use estas fontes externas como COMPLEMENTO aos materiais do usuário. Cite a fonte quando usar informações delas. Os materiais do usuário são SEMPRE a prioridade.\n`;
    }

    return new Response(
      JSON.stringify({ 
        results, 
        extracts,
        context: contextString,
        total: results.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("web-search error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
