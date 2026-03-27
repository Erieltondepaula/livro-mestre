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
  author?: string;
  year?: string;
  doi?: string;
  abnt_citation?: string;
}

function formatDate(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const months = ['jan.', 'fev.', 'mar.', 'abr.', 'maio', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
  return `${day} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function buildAbntCitation(result: SearchResult): string {
  const accessDate = formatDate();
  const author = result.author || result.source.toUpperCase();
  const year = result.year || new Date().getFullYear().toString();
  const title = result.title;

  if (result.source.startsWith("Wikipedia")) {
    return `${title.toUpperCase()}. In: WIKIPÉDIA: a enciclopédia livre. [S.l.]: Wikimedia Foundation, ${year}. Disponível em: ${result.url}. Acesso em: ${accessDate}.`;
  }

  if (result.source === "arXiv") {
    const authorFormatted = result.author ? result.author.split(',')[0].trim().toUpperCase() : "AUTOR DESCONHECIDO";
    return `${authorFormatted}. ${title}. arXiv, ${year}. Disponível em: ${result.url}. Acesso em: ${accessDate}.`;
  }

  if (result.source === "SciELO") {
    const authorFormatted = result.author ? result.author.split(',')[0].trim().toUpperCase() : "AUTOR DESCONHECIDO";
    const doiRef = result.doi ? ` DOI: ${result.doi}.` : '';
    return `${authorFormatted}. ${title}. SciELO, ${year}.${doiRef} Disponível em: ${result.url}. Acesso em: ${accessDate}.`;
  }

  if (result.source === "ERIC") {
    const authorFormatted = result.author ? result.author.split(',')[0].trim().toUpperCase() : "AUTOR DESCONHECIDO";
    return `${authorFormatted}. ${title}. ERIC, ${year}. Disponível em: ${result.url}. Acesso em: ${accessDate}.`;
  }

  return `${author.toUpperCase()}. ${title}. ${year}. Disponível em: ${result.url}. Acesso em: ${accessDate}.`;
}

// Wikipedia API
async function searchWikipedia(query: string, lang = "pt"): Promise<SearchResult[]> {
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=3&format=json&utf8=1&srprop=snippet`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0 (scholarly research)" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.query?.search || []).map((item: any) => {
      const result: SearchResult = {
        source: `Wikipedia (${lang.toUpperCase()})`,
        title: item.title,
        snippet: item.snippet.replace(/<[^>]+>/g, "").substring(0, 500),
        url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        year: new Date().getFullYear().toString(),
      };
      result.abnt_citation = buildAbntCitation(result);
      return result;
    });
  } catch (e) {
    console.error("Wikipedia search error:", e);
    return [];
  }
}

// Wikipedia extract
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

// arXiv API
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
      const authorMatch = entry.match(/<author><name>([\s\S]*?)<\/name>/);
      const author = authorMatch?.[1]?.trim() || "";
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
      const year = publishedMatch?.[1]?.substring(0, 4) || "";
      if (title) {
        const result: SearchResult = { source: "arXiv", title, snippet: summary, url: link, author, year };
        result.abnt_citation = buildAbntCitation(result);
        results.push(result);
      }
    }
    return results;
  } catch (e) {
    console.error("arXiv search error:", e);
    return [];
  }
}

// SciELO API
async function searchScielo(query: string): Promise<SearchResult[]> {
  try {
    const articleMetaUrl = `https://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(query)}&limit=3`;
    const resp = await fetch(articleMetaUrl, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    
    return (data.objects || []).slice(0, 3).map((item: any) => {
      const title = item.title || item.original_title || "Artigo SciELO";
      const titleStr = typeof title === 'object' ? (title.pt || title.en || Object.values(title)[0] || "Artigo") : title;
      const author = item.authors?.[0]?.surname ? `${item.authors[0].surname}, ${item.authors[0].given_names || ''}` : undefined;
      const year = item.publication_date?.substring(0, 4) || undefined;
      const doi = item.doi || undefined;
      const result: SearchResult = {
        source: "SciELO",
        title: titleStr,
        snippet: (item.abstract?.pt || item.abstract?.en || "").substring(0, 400),
        url: doi ? `https://doi.org/${doi}` : `https://www.scielo.br/`,
        author,
        year,
        doi,
      };
      result.abnt_citation = buildAbntCitation(result);
      return result;
    });
  } catch (e) {
    console.error("SciELO search error:", e);
    return [];
  }
}

// ERIC API
async function searchEric(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.ies.ed.gov/eric/?search=${encodeURIComponent(query)}&rows=3&format=json`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "BiblicalExegesisApp/1.0" },
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.response?.docs || []).map((doc: any) => {
      const author = doc.author?.[0] || undefined;
      const year = doc.publicationdateyear?.toString() || undefined;
      const result: SearchResult = {
        source: "ERIC",
        title: doc.title || "Artigo ERIC",
        snippet: (doc.description || "").substring(0, 400),
        url: doc.url || `https://eric.ed.gov/?id=${doc.id}`,
        author,
        year,
      };
      result.abnt_citation = buildAbntCitation(result);
      return result;
    });
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

    if (enabledSources.includes("wikipedia_pt")) promises.push(searchWikipedia(query, "pt"));
    if (enabledSources.includes("wikipedia_en")) promises.push(searchWikipedia(query, "en"));
    if (enabledSources.includes("arxiv")) promises.push(searchArxiv(query));
    if (enabledSources.includes("scielo")) promises.push(searchScielo(query));
    if (enabledSources.includes("eric")) promises.push(searchEric(query));

    const results = (await Promise.all(promises)).flat();

    // Get Wikipedia extracts for top results
    const wikiResults = results.filter(r => r.source.startsWith("Wikipedia"));
    const extracts: Record<string, string> = {};
    
    if (wikiResults.length > 0) {
      const extractPromises = wikiResults.slice(0, 2).map(async (r) => {
        const lang = r.source.includes("EN") ? "en" : "pt";
        const extract = await getWikipediaExtract(r.title, lang);
        if (extract) extracts[r.title] = extract;
      });
      await Promise.all(extractPromises);
    }

    // Build enriched context string with ABNT citations
    let contextString = "";
    if (results.length > 0) {
      contextString = "\n\n## 🌐 FONTES EXTERNAS (Pesquisa Acadêmica):\n";
      contextString += "\n**INSTRUÇÃO DE CITAÇÃO:** Ao utilizar informações das fontes abaixo, SEMPRE cite no formato ABNT com citação direta (entre aspas) ou indireta (paráfrase), indicando autor e ano. Inclua a referência completa ao final.\n";
      
      for (const r of results) {
        contextString += `\n### ${r.source}: ${r.title}`;
        if (r.author) contextString += ` — ${r.author}`;
        if (r.year) contextString += ` (${r.year})`;
        contextString += `\n`;
        
        if (extracts[r.title]) {
          contextString += `${extracts[r.title]}\n`;
        } else if (r.snippet) {
          contextString += `${r.snippet}\n`;
        }
        contextString += `🔗 ${r.url}\n`;
        if (r.abnt_citation) {
          contextString += `📎 **Ref. ABNT:** ${r.abnt_citation}\n`;
        }
      }
      
      contextString += `\n**REGRAS DE CITAÇÃO:**\n`;
      contextString += `- Citação Direta: Transcreva entre aspas, indicando (AUTOR, ano, p. X)\n`;
      contextString += `- Citação Indireta: Parafraseie indicando (AUTOR, ano)\n`;
      contextString += `- Apud: Se citar autor via outro, use (AUTOR1 apud AUTOR2, ano)\n`;
      contextString += `- Referências: Liste no final em formato ABNT\n`;
      contextString += `- Os materiais do usuário são SEMPRE a prioridade absoluta. Fontes externas são COMPLEMENTO acadêmico.\n`;
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
