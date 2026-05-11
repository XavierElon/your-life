import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// GitHub Pages project URL: https://<user>.github.io/<repo>/
// `base` must match the repo name. Dev uses '/' so localhost works; prod build uses /<repo>/.
export default defineConfig(({ mode }) => ({
  base:
    mode === 'development'
      ? '/'
      : '/your-life/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
}))
