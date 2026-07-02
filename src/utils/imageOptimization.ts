/**
 * Image and export optimization utilities
 */

/**
 * Optimize SVG for better rendering performance
 */
export function optimizeSVGForExport(svgElement: SVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGElement;

  // Remove unnecessary attributes
  clone.removeAttribute('data-testid');
  clone.removeAttribute('data-test');

  // Optimize styles
  const styles = clone.querySelectorAll('[style]');
  styles.forEach((el) => {
    const style = (el as any).style;
    // Keep only essential styles
    const essentialProps = ['fill', 'stroke', 'opacity', 'transform'];
    const newStyle = essentialProps
      .filter((prop) => style[prop])
      .map((prop) => `${prop}: ${style[prop]}`)
      .join('; ');

    if (newStyle) {
      (el as any).setAttribute('style', newStyle);
    }
  });

  return new XMLSerializer().serializeToString(clone);
}

/**
 * Compress image data with quality preservation
 */
export async function compressImage(
  canvas: HTMLCanvasElement,
  quality: number = 0.85,
  format: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png'
): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, format, quality);
  });
}

/**
 * Generate responsive image sizes
 */
export const RESPONSIVE_SIZES = {
  thumbnail: { width: 400, height: 400, label: 'Thumbnail' },
  social: { width: 1080, height: 1080, label: 'Instagram Square' },
  story: { width: 1080, height: 1920, label: 'Instagram Story' },
  hd: { width: 1920, height: 1080, label: 'Full HD' },
  '2k': { width: 2560, height: 1440, label: '2K' },
  '4k': { width: 3840, height: 2160, label: '4K' },
  '8k': { width: 7680, height: 4320, label: '8K' },
};

export type ResponsiveSize = keyof typeof RESPONSIVE_SIZES;

/**
 * Calculate optimal canvas size based on screen DPI
 */
export function getOptimalCanvasSize(
  width: number,
  height: number,
  scale: number = 1
): { width: number; height: number; scale: number } {
  const dpr = window.devicePixelRatio || 1;
  const effectiveScale = Math.max(1, Math.min(2, dpr * scale));

  return {
    width: Math.round(width * effectiveScale),
    height: Math.round(height * effectiveScale),
    scale: effectiveScale,
  };
}

/**
 * Generate multiple export formats in parallel
 */
export async function exportMultipleFormats(
  svgElement: SVGElement,
  formats: Array<{ format: string; quality?: number }>
): Promise<Map<string, Blob>> {
  const results = new Map<string, Blob>();

  const promises = formats.map(async ({ format, quality = 0.85 }) => {
    try {
      // Convert SVG to Canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
          canvas.toBlob(
            (blob) => {
              if (blob) results.set(format, blob);
              resolve();
            },
            mimeType,
            quality
          );
        };
        img.onerror = reject;
        img.src = url;
      });
    } catch (error) {
      console.error(`Failed to export ${format}:`, error);
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Generate filename with timestamp
 */
export function generateExportFilename(
  prefix: string = 'calendar',
  extension: string = 'png'
): string {
  const timestamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  return `${prefix}-${timestamp}.${extension}`;
}
