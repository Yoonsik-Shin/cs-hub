import { IMAGE_POLICY } from './policy';

function replaceFileExtension(fileName: string, extension: string): string {
  const safeName = fileName.replace(/\s+/g, '_');
  const dotIndex = safeName.lastIndexOf('.');
  const baseName = dotIndex > 0 ? safeName.slice(0, dotIndex) : safeName;
  return `${baseName}.${extension}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`이미지 파일을 읽을 수 없습니다: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;

  const image = await loadImage(file);
  const scale = Math.min(1, IMAGE_POLICY.maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return file;

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', IMAGE_POLICY.compressionQuality);
  });

  if (!blob || blob.size >= file.size) return file;

  return new File([blob], replaceFileExtension(file.name, 'jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
