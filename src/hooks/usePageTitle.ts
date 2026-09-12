import { useEffect } from 'react'

/** Setea el título de la pestaña y un meta description básico. */
export function usePageTitle(title?: string, description?: string) {
  useEffect(() => {
    if (title) document.title = title
    else document.title = "M' encanta"
    if (description) {
      const meta = document.querySelector('meta[name="description"]')
      if (meta) meta.setAttribute('content', description)
    }
  }, [title, description])
}