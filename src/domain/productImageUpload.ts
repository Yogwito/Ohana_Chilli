const DEFAULT_MAX_EDGE = 768;
const DEFAULT_WEBP_QUALITY = 0.8;

export function getOptimizedImageDimensions(width: number, height: number, maxEdge = DEFAULT_MAX_EDGE) {
  const longestEdge = Math.max(width, height);
  const scale = longestEdge > maxEdge ? maxEdge / longestEdge : 1;

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo convertir la imagen a WebP'));
    }, 'image/webp', quality);
  });
}

export async function optimizeProductImage(file: File) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    throw new Error('Selecciona una imagen JPG, PNG, WebP o AVIF');
  }

  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  try {
    const dimensions = getOptimizedImageDimensions(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la imagen');
    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const blob = await canvasToWebp(canvas, DEFAULT_WEBP_QUALITY);
    const originalName = file.name.replace(/\.[^.]+$/, '') || 'producto';

    return new File([blob], `${originalName}.webp`, {
      type: 'image/webp',
      lastModified: Date.now(),
    });
  } finally {
    bitmap.close();
  }
}

export function buildProductImageStoragePath(productId: string | null, timestamp = Date.now()) {
  const safeProductId = (productId ?? 'new-product').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `optimized/${safeProductId}-${timestamp}.webp`;
}
