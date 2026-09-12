import type { Env } from '../types'
import { badRequest } from './errors'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

interface DetectedType {
  ext: string
  contentType: string
}

function detectImageType(data: Uint8Array): DetectedType | null {
  if (data.length < 12) return null
  // JPEG
  if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' }
  }
  // PNG
  if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' }
  }
  // GIF
  if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x38) {
    return { ext: 'gif', contentType: 'image/gif' }
  }
  // WebP: RIFF....WEBP
  if (
    data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46 &&
    data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50
  ) {
    return { ext: 'webp', contentType: 'image/webp' }
  }
  // AVIF: ftypavir / ftypmif1 / ftypisom (ftyp)
  if (data[4] === 0x66 && data[5] === 0x74 && data[6] === 0x79 && data[7] === 0x70) {
    return { ext: 'avif', contentType: 'image/avif' }
  }
  return null
}

/**
 * Valida y guarda una imagen en R2. `folder` es uno de:
 * products | categories | banners | showroom
 */
export async function uploadImage(
  env: Env,
  file: File,
  folder: string,
): Promise<{ key: string; url: string; contentType: string; size: number }> {
  if (file.size > MAX_FILE_SIZE) {
    throw badRequest('FILE_TOO_LARGE', 'La imagen supera el tamaño máximo de 5 MB.')
  }
  const buffer = new Uint8Array(await file.arrayBuffer())
  const detected = detectImageType(buffer)
  if (!detected) {
    throw badRequest('INVALID_FILE_TYPE', 'El archivo debe ser una imagen JPG, PNG, WebP, AVIF o GIF.')
  }

  const key = `${folder}/${crypto.randomUUID()}.${detected.ext}`
  await env.BUCKET.put(key, buffer, {
    httpMetadata: { contentType: detected.contentType },
  })

  return {
    key,
    url: `/api/files/${key}`,
    contentType: detected.contentType,
    size: buffer.length,
  }
}

export async function getFileUrl(env: Env, key: string): Promise<Response> {
  const object = await env.BUCKET.get(key)
  if (!object) return new Response('Not Found', { status: 404 })
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('cache-control', 'public, max-age=31536000, immutable')
  headers.set('content-type', object.httpMetadata?.contentType ?? 'application/octet-stream')
  return new Response(object.body, { headers })
}