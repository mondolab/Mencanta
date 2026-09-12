import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { uploadImage } from '../lib/r2'
import { badRequest } from '../lib/errors'

const uploadsRoutes = new Hono<AppEnv>()

const ALLOWED_FOLDERS = ['products', 'categories', 'banners', 'showroom']

/** POST /api/files/upload — sube una imagen a R2 (multipart: campo "file"). */
uploadsRoutes.post('/', async (c) => {
  const folder = c.req.query('folder') ?? 'products'
  if (!ALLOWED_FOLDERS.includes(folder)) throw badRequest('INVALID_FOLDER', 'Carpeta inválida.')

  let formData: FormData
  try {
    formData = await c.req.formData()
  } catch {
    throw badRequest('INVALID_BODY', 'El cuerpo debe ser multipart/form-data.')
  }
  const file = formData.get('file')
  if (!(file instanceof File)) throw badRequest('NO_FILE', 'Falta el archivo.')

  const uploaded = await uploadImage(c.env, file, folder)
  return c.json({ success: true, data: uploaded }, 201)
})

export default uploadsRoutes