import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface AcfVerseRequest {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function extractVerseFromMarkdown(markdown: string, verseNumber: number): string {
  const exactPattern = new RegExp(`\\n\\s*${verseNumber}\\s+([\\s\\S]*?)\\n\\nAlmeida Corrigida Fiel`, "i");
  const exactMatch = markdown.match(exactPattern);
  if (exactMatch?.[1]) {
    return cleanText(exactMatch[1]);
  }

  const beforeCopyright = markdown.split("Almeida Corrigida Fiel")[0] || markdown;
  const lines = beforeCopyright
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const fallbackLine = lines.find((line) => new RegExp(`^${verseNumber}\\s+`).test(line));
  if (fallbackLine) {
    return cleanText(fallbackLine.replace(new RegExp(`^${verseNumber}\\s+`), ""));
  }

  return "";
}

async function fetchAcfSingleVerse(book: string, chapter: number, verse: number): Promise<string> {
  const sourceUrl = `http://www.bibliaonline.com.br/acf/${encodeURIComponent(book)}/${chapter}/${verse}`;
  const proxyUrl = `https://r.jina.ai/${sourceUrl}`;

  const response = await fetch(proxyUrl, {
    headers: {
      "Accept": "text/plain, text/markdown;q=0.9, */*;q=0.8",
      "User-Agent": "Lovable-ACF-Verse/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Falha ao buscar versículo ACF [${response.status}]`);
  }

  const markdown = await response.text();
  return extractVerseFromMarkdown(markdown, verse);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as AcfVerseRequest;
    const book = body.book?.trim();
    const chapter = Number(body.chapter);
    const verseStart = Number(body.verseStart);
    const verseEnd = Number(body.verseEnd ?? verseStart);

    if (!book || !Number.isFinite(chapter) || !Number.isFinite(verseStart) || !Number.isFinite(verseEnd)) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (chapter < 1 || verseStart < 1 || verseEnd < verseStart || verseEnd - verseStart > 30) {
      return new Response(JSON.stringify({ error: "Faixa de versículos inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verseParts: string[] = [];
    for (let verse = verseStart; verse <= verseEnd; verse++) {
      const text = await fetchAcfSingleVerse(book, chapter, verse);
      if (text) verseParts.push(text);
    }

    const text = cleanText(verseParts.join(" "));

    if (!text) {
      return new Response(JSON.stringify({ error: "Texto bíblico ACF não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
