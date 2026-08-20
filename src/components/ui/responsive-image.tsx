import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * ResponsiveImage
 * ---------------------------------------------------------------------------
 * Imagem adaptável a qualquer viewport e densidade de pixels (PPI).
 *
 * Como funciona:
 * - Gera um `srcSet` com múltiplas larguras físicas (w) a partir da URL original.
 *   Imagens hospedadas no storage do backend aceitam `?width=` (transformação
 *   no servidor), então o navegador escolhe o arquivo mais leve possível:
 *     • smartwatch / celular antigo (<320px, 1x)  -> 160w  (economia de banda)
 *     • iPhone 16 Pro (402pt @3x)                 -> 1206w equivalente -> 1280w
 *     • tablet / laptop                           -> 640w / 960w
 *     • monitor ultra-wide / TV 4K                -> 1600w / 2400w
 * - `sizes` informa a largura de exibição por breakpoint, evitando que telas
 *   pequenas baixem ativos grandes.
 * - `loading="lazy"` + `decoding="async"` mantêm o carregamento das mídias
 *   pesadas fora da renderização inicial (crítico em TVs, onde os ativos são
 *   os maiores do conjunto), e `fetchPriority` permite promover a capa
 *   principal quando ela é o conteúdo mais importante da tela.
 * - Quando a URL não suporta transformação (link externo), o componente cai
 *   graciosamente para o `src` único, sem quebrar a imagem.
 */

const DEFAULT_WIDTHS = [160, 320, 480, 640, 960, 1280, 1600, 2400];

/** Larguras de exibição padrão: 1 coluna no mobile, grade no tablet/desktop, teto na TV. */
const DEFAULT_SIZES =
  '(max-width: 319px) 150px, (max-width: 480px) 45vw, (max-width: 992px) 30vw, (max-width: 1440px) 22vw, 320px';

function supportsTransform(url: string) {
  // Transformação de imagem por querystring (storage público do backend).
  return /\/storage\/v1\/(object|render\/image)\/public\//.test(url);
}

function buildUrl(url: string, width: number) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}width=${width}&quality=80`;
}

interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  /** Larguras físicas a oferecer ao navegador (descritores `w`). */
  widths?: number[];
  /** Atributo `sizes` — largura de exibição por faixa de viewport. */
  sizes?: string;
  /** `true` apenas para a imagem principal acima da dobra. */
  priority?: boolean;
}

export function ResponsiveImage({
  src,
  alt,
  widths = DEFAULT_WIDTHS,
  sizes = DEFAULT_SIZES,
  priority = false,
  className,
  ...rest
}: ResponsiveImageProps) {
  const srcSet = useMemo(() => {
    if (!src || !supportsTransform(src)) return undefined;
    return widths.map((w) => `${buildUrl(src, w)} ${w}w`).join(', ');
  }, [src, widths]);

  return (
    <picture>
      <img
        src={srcSet ? buildUrl(src, 640) : src}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className={cn(className)}
        {...rest}
      />
    </picture>
  );
}
