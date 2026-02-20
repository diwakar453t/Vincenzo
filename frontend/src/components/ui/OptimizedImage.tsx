import { useState } from 'react';

interface OptimizedImageProps {
    src: string;
    alt: string;
    srcSet?: string;
    sizes?: string;
    width?: number | string;
    height?: number | string;
    className?: string;
    style?: React.CSSProperties;
    /** Optional fallback image shown on load error */
    fallbackSrc?: string;
}

/**
 * Drop-in replacement for <img> with built-in performance best practices:
 * - Native lazy loading (`loading="lazy"`)
 * - Async decoding (`decoding="async"`)
 * - Optional responsive `srcSet` + `sizes` for multiple resolutions
 * - Graceful error fallback
 */
export default function OptimizedImage({
    src,
    alt,
    srcSet,
    sizes,
    width,
    height,
    className,
    style,
    fallbackSrc = '/vite.svg',
}: OptimizedImageProps) {
    const [imgSrc, setImgSrc] = useState(src);

    return (
        <img
            src={imgSrc}
            alt={alt}
            srcSet={srcSet}
            sizes={sizes}
            width={width}
            height={height}
            className={className}
            style={style}
            loading="lazy"
            decoding="async"
            onError={() => {
                if (imgSrc !== fallbackSrc) {
                    setImgSrc(fallbackSrc);
                }
            }}
        />
    );
}
