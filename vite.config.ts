import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web'

  return {
    plugins: [
      react(),
      tailwindcss(),
      !isWeb && electron({
        main: {
          // Shortcut of `build.lib.entry`.
          entry: 'electron/main.ts',
        },
        preload: {
          // Shortcut of `build.rollupOptions.input`.
          input: path.join(__dirname, 'electron/preload.ts'),
        },
        renderer: process.env.NODE_ENV === 'test' ? undefined : {},
      }),
    ].filter(Boolean) as any,
  }
})
