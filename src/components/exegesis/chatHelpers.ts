import { supabase } from '@/integrations/supabase/client';
import type { ExegesisMaterial } from '@/hooks/useExegesis';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerSrc;

export type ChatAttachmentType = 'image' | 'document' | 'audio' | 'video';

export interface ChatAttachment {
  name: string;
  type: ChatAttachmentType;
  url?: string;
  base64?: string;
  transcription?: string;
  extractedText?: string;
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'm4a', 'ogg'];
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov'];
const TEXT_EXTENSIONS = ['txt', 'md'];
const PDF_EXTENSIONS = ['pdf'];

const materialTextCache = new Map<string, string>();

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const tokenize = (value: string) =>
  Array.from(new Set(normalizeText(value).split(/[^a-z0-9]+/).filter(token => token.length > 2)));

const compactText = (value: string, maxLength = 5000) => value.replace(/\s+/g, ' ').trim().slice(0, maxLength);

const getFileExtension = (fileName: string) => fileName.split('.').pop()?.toLowerCase() || '';

export const getAttachmentType = (file: File): ChatAttachmentType => {
  const extension = getFileExtension(file.name);

  if (IMAGE_EXTENSIONS.includes(extension) || file.type.startsWith('image/')) return 'image';
  if (AUDIO_EXTENSIONS.includes(extension) || file.type.startsWith('audio/')) return 'audio';
  if (VIDEO_EXTENSIONS.includes(extension) || file.type.startsWith('video/')) return 'video';
  return 'document';
};

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

async function extractPdfText(input: Blob | File): Promise<string> {
  const bytes = new Uint8Array(await input.arrayBuffer());
  const pdf = await getDocument({ data: bytes }).promise;
  const pages = Math.min(pdf.numPages, 10);
  const parts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();

    if (pageText) {
      parts.push(`Página ${pageNumber}: ${pageText}`);
    }
  }

  return compactText(parts.join('\n'), 12000);
}

async function extractDocumentText(file: File): Promise<string> {
  const extension = getFileExtension(file.name);

  if (TEXT_EXTENSIONS.includes(extension)) {
    return compactText(await file.text(), 12000);
  }

  if (PDF_EXTENSIONS.includes(extension)) {
    return extractPdfText(file);
  }

  return '';
}

export async function buildAttachmentFromFile(file: File): Promise<ChatAttachment> {
  const type = getAttachmentType(file);
  const attachment: ChatAttachment = {
    name: file.name,
    type,
    url: URL.createObjectURL(file),
  };

  if (type === 'image') {
    attachment.base64 = await fileToBase64(file);
  }

  if (type === 'document') {
    attachment.extractedText = await extractDocumentText(file);
  }

  if (type === 'audio') {
    attachment.transcription = `[Áudio enviado: ${file.name}]`;
  }

  return attachment;
}

export function buildAttachmentPrompt(input: string, attachments: ChatAttachment[]) {
  const baseText = input.trim();
  if (attachments.length === 0) {
    return { prompt: baseText, attachmentsOnly: false };
  }

  const attachmentBlocks = attachments.map((attachment) => {
    if (attachment.type === 'image') {
      return `- Imagem: ${attachment.name} — use o conteúdo visual como ponto de partida da conversa.`;
    }

    if (attachment.type === 'document') {
      if (attachment.extractedText?.trim()) {
        return `- Documento: ${attachment.name}\nTrecho extraído:\n${attachment.extractedText.slice(0, 3000)}`;
      }

      return `- Documento: ${attachment.name} — o arquivo foi enviado, mas o texto não pôde ser extraído automaticamente.`;
    }

    if (attachment.type === 'audio') {
      return `- Áudio: ${attachment.name} — considere este áudio como parte da conversa.`;
    }

    return `- Vídeo: ${attachment.name} — considere o conteúdo do vídeo como parte da conversa.`;
  });

  if (!baseText) {
    return {
      prompt: `Analise primeiro os anexos enviados e comece a conversa a partir deles. Diga claramente o que você conseguiu ver ou ler e só depois continue a conversa.\n\n## Anexos enviados\n${attachmentBlocks.join('\n\n')}`,
      attachmentsOnly: true,
    };
  }

  return {
    prompt: `${baseText}\n\n## Anexos enviados\n${attachmentBlocks.join('\n\n')}`,
    attachmentsOnly: false,
  };
}

function scoreMaterial(material: ExegesisMaterial, tokens: string[]) {
  if (tokens.length === 0) return 1;

  const searchable = normalizeText([
    material.title,
    material.description,
    material.theme,
    material.author,
    material.content_origin,
    ...(material.keywords || []),
    ...(material.sub_themes || []),
    ...(material.bible_references || []),
  ].filter(Boolean).join(' '));

  return tokens.reduce((score, token) => {
    if (searchable.includes(token)) score += 2;
    if (normalizeText(material.title).includes(token)) score += 3;
    if ((material.bible_references || []).some(reference => normalizeText(reference).includes(token))) score += 2;
    return score;
  }, 0);
}

function extractRelevantExcerpt(content: string, tokens: string[]) {
  const normalizedContent = normalizeText(content);
  const firstMatch = tokens.find(token => normalizedContent.includes(token));

  if (!firstMatch) return compactText(content, 2200);

  const index = normalizedContent.indexOf(firstMatch);
  const start = Math.max(0, index - 500);
  const end = Math.min(content.length, index + 1700);
  return compactText(content.slice(start, end), 2200);
}

async function readMaterialText(material: ExegesisMaterial): Promise<string> {
  if (!material.file_path) return '';

  if (materialTextCache.has(material.file_path)) {
    return materialTextCache.get(material.file_path) || '';
  }

  try {
    const extension = getFileExtension(material.file_path);
    if (!TEXT_EXTENSIONS.includes(extension) && !PDF_EXTENSIONS.includes(extension)) {
      return '';
    }

    const { data, error } = await supabase.storage.from('exegesis-materials').download(material.file_path);
    if (error) throw error;

    const extracted = TEXT_EXTENSIONS.includes(extension)
      ? compactText(await data.text(), 12000)
      : await extractPdfText(data);

    materialTextCache.set(material.file_path, extracted);
    return extracted;
  } catch (error) {
    console.warn('Não foi possível ler material para o chat:', material.title, error);
    return '';
  }
}

export async function buildRelevantMaterialsContext(materials: ExegesisMaterial[], query: string) {
  if (materials.length === 0) {
    return { context: undefined, hasRelevantMatches: false };
  }

  const tokens = tokenize(query);
  const ranked = [...materials]
    .map(material => ({ material, score: scoreMaterial(material, tokens) }))
    .sort((left, right) => right.score - left.score);

  const topMaterials = (tokens.length > 0 ? ranked.filter(item => item.score > 0) : ranked).slice(0, 6);
  const hasRelevantMatches = tokens.length === 0 ? materials.length > 0 : topMaterials.length > 0;

  const counts = {
    biblia: materials.filter(material => material.material_category === 'biblia').length,
    comentario: materials.filter(material => material.material_category === 'comentario').length,
    dicionario: materials.filter(material => material.material_category === 'dicionario').length,
    livro: materials.filter(material => material.material_category === 'livro').length,
    devocional: materials.filter(material => material.material_category === 'devocional').length,
    midia: materials.filter(material => material.material_category === 'midia').length,
  };

  const materialBlocks = await Promise.all(
    topMaterials.map(async ({ material }) => {
      const fullText = await readMaterialText(material);
      const excerpt = fullText ? extractRelevantExcerpt(fullText, tokens) : '';

      const metadata = [
        `Título: ${material.title}`,
        material.author ? `Autor: ${material.author}` : null,
        `Categoria: ${material.material_category}`,
        material.description ? `Descrição: ${material.description}` : null,
        material.theme ? `Tema: ${material.theme}` : null,
        material.keywords?.length ? `Palavras-chave: ${material.keywords.join(', ')}` : null,
        material.bible_references?.length ? `Referências bíblicas: ${material.bible_references.join(', ')}` : null,
        material.url ? `Link: ${material.url}` : null,
        excerpt ? `Trecho útil do material:\n${excerpt}` : null,
      ].filter(Boolean).join('\n');

      return `### 「${material.title}」\n${metadata}`;
    })
  );

  const context = [
    `## BIBLIOTECA DO USUÁRIO — FONTE PRIMÁRIA ABSOLUTA`,
    `Total: ${materials.length} materiais`,
    `Bíblias: ${counts.biblia} | Comentários: ${counts.comentario} | Dicionários: ${counts.dicionario} | Livros: ${counts.livro} | Devocionais: ${counts.devocional} | Mídia: ${counts.midia}`,
    `USE primeiro os materiais abaixo. Só complemente com fonte externa se realmente faltar informação específica.`,
    materialBlocks.join('\n\n'),
  ].filter(Boolean).join('\n\n');

  return { context, hasRelevantMatches };
}

export function shouldSearchWeb(params: {
  explicitText: string;
  webSearchEnabled: boolean;
  hasRelevantMaterialMatches: boolean;
  hasMaterials: boolean;
}) {
  const { explicitText, webSearchEnabled, hasRelevantMaterialMatches, hasMaterials } = params;

  if (!webSearchEnabled) return false;

  const text = normalizeText(explicitText);
  const explicitlyAskedForWeb = ['web', 'internet', 'google', 'pesquise', 'busque', 'fonte externa', 'pesquisa externa']
    .some(keyword => text.includes(keyword));

  if (explicitlyAskedForWeb) return true;
  if (!hasMaterials) return true;
  return !hasRelevantMaterialMatches;
}