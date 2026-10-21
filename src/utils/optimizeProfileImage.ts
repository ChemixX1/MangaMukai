async function decodeImage(file: File) {
  // Image is also a fallback for mobile browsers without createImageBitmap.
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch { /* Try the browser's image decoder. */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export async function optimizeProfileImage(file: File, type: 'avatar' | 'banner'): Promise<File> {
  if (type === 'avatar' && file.type === 'image/gif') return file;
  try {
    const image = await decodeImage(file);
    try {
      const scale = Math.min(1, (type === 'avatar' ? 512 : 1920) / image.width, (type === 'avatar' ? 512 : 1080) / image.height);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(image.source, 0, 0, canvas.width, canvas.height);
      const encode = (quality: number) => new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => {
          if (blob?.type === 'image/webp') resolve(blob);
          else reject(new Error('Este navegador no pudo convertir la portada a WebP.'));
        }, 'image/webp', quality);
      });
      let blob = await encode(type === 'avatar' ? .86 : .82);
      if (type === 'banner') {
        for (const quality of [.72, .62]) {
          if (blob.size <= 450 * 1024) break;
          blob = await encode(quality);
        }
      } else if (blob.size >= file.size) return file;
      return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
    } finally { image.close(); }
  } catch (error) {
    if (type === 'avatar') return file;
    throw error;
  }
}
