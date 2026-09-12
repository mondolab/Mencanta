import { Fragment } from 'react'

/** Renderiza texto multilínea respetando saltos de línea. */
export function SmartText({ text }: { text: string }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, i) => (
        <Fragment key={i}>
          {line}
          {i < text.split('\n').length - 1 && <br />}
        </Fragment>
      ))}
    </>
  )
}