import { ApiError } from '../_shared';
import { ragEnv } from './env';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function matchesMimeSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === 'image/webp') {
    return (
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return false;
}

export type ValidatedImage = {
  dataUrl: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  bytes: Buffer;
};

export function validateImagePayload(rawImage: unknown): ValidatedImage | undefined {
  if (rawImage === undefined || rawImage === null) {
    return undefined;
  }

  const dataUrl = typeof (rawImage as { dataUrl?: unknown })?.dataUrl === 'string'
    ? (rawImage as { dataUrl: string }).dataUrl
    : '';
  const mimeType = typeof (rawImage as { mimeType?: unknown })?.mimeType === 'string'
    ? (rawImage as { mimeType: string }).mimeType
    : '';

  if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
    throw new ApiError(400, 'Unsupported image. Please use JPEG, PNG, or WebP.');
  }

  const match = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/u.exec(dataUrl);

  if (!match || match[1] !== mimeType) {
    throw new ApiError(400, 'Invalid image payload.');
  }

  const bytes = Buffer.from(match[2], 'base64');

  if (!bytes.length) {
    throw new ApiError(400, 'Image payload is empty.');
  }

  if (bytes.length > ragEnv.maxImageBytes()) {
    throw new ApiError(413, 'Image is too large. Please choose a smaller image.');
  }

  if (!matchesMimeSignature(bytes, mimeType)) {
    throw new ApiError(400, 'Image content does not match its declared type.');
  }

  return {
    dataUrl,
    mimeType: mimeType as ValidatedImage['mimeType'],
    bytes,
  };
}
