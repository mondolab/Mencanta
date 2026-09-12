export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code = 'ERROR', status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

interface RequestOptions extends RequestInit {
  raw?: boolean
  isFormData?: boolean
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const { raw, isFormData, ...init } = options

  const headers = new Headers(init.headers)
  if (!isFormData && init.body) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(path, {
    ...init,
    headers,
    credentials: 'same-origin',
  })

  if (raw) {
    if (!res.ok) {
      throw new ApiError('No se pudo completar la operación.', 'HTTP_ERROR', res.status)
    }
    return (await res.text()) as T
  }

  type ApiBody<T> = { success?: boolean; data?: T; message?: string; code?: string }
  let body: ApiBody<T> | null = null
  try {
    body = (await res.json()) as ApiBody<T>
  } catch {
    body = null
  }

  if (!res.ok || !body?.success) {
    const message = body?.message ?? 'Ocurrió un error inesperado.'
    const code = body?.code ?? 'ERROR'
    const status = res.status
    if (status === 401) {
      window.dispatchEvent(new CustomEvent('mencanta:unauthorized'))
    }
    throw new ApiError(message, code, status)
  }

  return body.data as T
}

export const api = {
  get<T = unknown>(path: string): Promise<T> {
    return request<T>(path)
  },
  post<T = unknown>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: data === undefined ? undefined : JSON.stringify(data),
    })
  },
  put<T = unknown>(path: string, data?: unknown): Promise<T> {
    return request<T>(path, {
      method: 'PUT',
      body: data === undefined ? undefined : JSON.stringify(data),
    })
  },
  delete<T = unknown>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' })
  },
}

/** Sube una imagen a R2 y devuelve su URL pública (el nombre lo genera el sistema). */
export async function uploadImageFile(file: File, folder: string): Promise<{ key: string; url: string }> {
  const formData = new FormData()
  formData.append('file', file)
  const data = await request<{ key: string; url: string }>(`/api/admin/uploads?folder=${folder}`, {
    method: 'POST',
    body: formData,
    isFormData: true,
  })
  return data
}