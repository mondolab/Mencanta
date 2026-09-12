import { AppError, badRequest } from './errors'
import type { Env } from '../types'

const GITHUB_API = 'https://api.github.com'
const GITHUB_OWNER = 'mondolab'
const GITHUB_REPO = 'Mencanta'
const GITHUB_BRANCH = 'main'

type GitHubContentResponse = {
  content?: {
    path: string
    sha: string
    html_url?: string
    download_url?: string | null
  }
  commit?: {
    sha?: string
    html_url?: string
  }
  message?: string
}

type GitHubFileResponse = {
  sha: string
}

/**
 * Convierte bytes binarios a Base64 de forma compatible
 * con Cloudflare Workers.
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

/**
 * Normaliza un nombre para utilizarlo como nombre de archivo.
 */
function slugifyFilename(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

/**
 * Obtiene el SHA de un archivo existente.
 *
 * GitHub requiere el SHA cuando se reemplaza un archivo existente.
 */
async function getExistingFileSha(
  token: string,
  path: string,
): Promise<string | null> {
  const url =
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${encodeURIComponent(path)}` +
    `?ref=${encodeURIComponent(GITHUB_BRANCH)}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      'User-Agent': 'Mencanta-OPA-Worker',
    },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    const text = await response.text()

    console.error(
      '[github:getExistingFileSha]',
      response.status,
      text,
    )

    throw new AppError(
      500,
      'INTERNAL',
      'No se pudo consultar GitHub.',
    )
  }

  const data = (await response.json()) as GitHubFileResponse

  return data.sha ?? null
}

/**
 * Sube una imagen al repositorio GitHub.
 *
 * La imagen se guarda en:
 *
 * public/images/{folder}/archivo.ext
 */
export async function uploadImageToGitHub(
  env: Env,
  file: File,
  folder: 'products' | 'categories' | 'banners',
) {
  const token = env.GITHUB_TOKEN?.trim()

  if (!token) {
    throw new AppError(
      500,
      'INTERNAL',
      'No está configurado el token de GitHub.',
    )
  }

  if (!file || file.size <= 0) {
    throw badRequest(
      'INVALID_FILE',
      'El archivo está vacío.',
    )
  }

  const maxSize = 5 * 1024 * 1024

  if (file.size > maxSize) {
    throw badRequest(
      'FILE_TOO_LARGE',
      'La imagen no puede superar los 5 MB.',
    )
  }

  const allowedTypes: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }

  const extension = allowedTypes[file.type]

  if (!extension) {
    throw badRequest(
      'INVALID_FILE_TYPE',
      'El archivo debe ser JPG, PNG, WebP o GIF.',
    )
  }

  const originalName =
    file.name || `imagen.${extension}`

  const baseName =
    slugifyFilename(
      originalName.replace(/\.[^.]+$/, ''),
    ) || `imagen-${crypto.randomUUID()}`

  const filename =
    `${baseName}-${crypto.randomUUID().slice(0, 8)}.${extension}`

  const path =
    `public/images/${folder}/${filename}`

  const bytes =
    new Uint8Array(await file.arrayBuffer())

  const content =
    uint8ArrayToBase64(bytes)

  const existingSha =
    await getExistingFileSha(token, path)

  const url =
    `${GITHUB_API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}` +
    `/contents/${path}`

  const payload: Record<string, unknown> = {
    message: `Sube imagen: ${path}`,
    content,
    branch: GITHUB_BRANCH,
    committer: {
      name: 'Mencanta OPA',
      email:
        '41898282+github-actions[bot]@users.noreply.github.com',
    },
  }

  if (existingSha) {
    payload.sha = existingSha
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2026-03-10',
      'Content-Type': 'application/json',
      'User-Agent': 'Mencanta-OPA-Worker',
    },
    body: JSON.stringify(payload),
  })

  const data =
    (await response.json()) as GitHubContentResponse

  if (!response.ok) {
    console.error(
      '[github:upload]',
      response.status,
      data,
    )

    throw new AppError(
      500,
      'INTERNAL',
      data.message ||
        'No se pudo subir la imagen a GitHub.',
    )
  }

  const rawUrl =
    `https://raw.githubusercontent.com/` +
    `${GITHUB_OWNER}/${GITHUB_REPO}/` +
    `${GITHUB_BRANCH}/${path}`

  return {
    path,
    url: rawUrl,
    htmlUrl: data.content?.html_url ?? null,
    commitSha: data.commit?.sha ?? null,
    contentType: file.type,
    size: file.size,
  }
}