import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
// Project Pages URL: https://<user>.github.io/<repo>/ — base must equal /<repo>/
export default defineConfig({
  base: '/your-life/',
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
})
