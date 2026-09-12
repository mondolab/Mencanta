import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { badRequest } from '../lib/errors'
import { uploadImageToGitHub } from '../lib/github'

const uploadsRoutes = new Hono<AppEnv>()

const ALLOWED_FOLDERS = ['products', 'categories', 'banners'] as const

type UploadFolder = (typeof ALLOWED_FOLDERS)[number]

/**
 * POST /api/admin/uploads
 *
 * Sube una imagen directamente al repositorio GitHub.
 *
 * multipart/form-data:
 * - file: archivo de imagen
 *
 * Query:
 * - folder: products | categories | banners
 */
uploadsRoutes.post('/', async (c) => {
  const folderParam = c.req.query('folder') ?? 'products'

  if (!ALLOWED_FOLDERS.includes(folderParam as UploadFolder)) {
    throw badRequest(
      'INVALID_FOLDER',
      'Carpeta inválida.',
    )
  }

  const folder = folderParam as UploadFolder

  let formData: FormData

  try {
    formData = await c.req.formData()
  } catch {
    throw badRequest(
      'INVALID_BODY',
      'El cuerpo debe ser multipart/form-data.',
    )
  }

  const file = formData.get('file')

  if (!(file instanceof File)) {
    throw badRequest(
      'NO_FILE',
      'Falta el archivo.',
    )
  }

  const uploaded = await uploadImageToGitHub(
    c.env,
    file,
    folder,
  )

  return c.json(
    {
      success: true,
      data: uploaded,
    },
    201,
  )
})

export default uploadsRoutes