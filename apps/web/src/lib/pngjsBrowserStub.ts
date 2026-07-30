// Vite-only replacement for Core's Node PNG dependency. Studio's predictive
// preview always requests SVG; any accidental browser PNG path fails closed.
const unsupported = (): never => {
  throw new Error('PNG rendering is unavailable in the browser preview; request SVG instead.')
}

export const PNG = {
  sync: {
    read: unsupported,
    write: unsupported,
  },
}
