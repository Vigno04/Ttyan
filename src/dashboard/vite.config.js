import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

// Custom plugin to serve OfficialPlugins directory at /OfficialPlugins
function serveOfficialPlugins() {
  const pluginsDir = path.resolve(__dirname, '../../OfficialPlugins')
  return {
    name: 'serve-official-plugins',
    configureServer(server) {
      server.middlewares.use('/OfficialPlugins', (req, res, next) => {
        const filePath = path.join(pluginsDir, req.url)
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mimeTypes = {
            '.json': 'application/json',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.webp': 'image/webp',
          }
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), serveOfficialPlugins()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
