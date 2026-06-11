import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  
  const backendPort = parseInt(env.BACKEND_PORT) || 3110
  const backendHost = env.BACKEND_HOST || 'localhost'
  const backendProtocol = env.BACKEND_PROTOCOL || 'http'
  const frontendPort = parseInt(env.FRONTEND_PORT) || 7173
  const apiPrefix = env.API_PREFIX || '/api'
  
  const backendTarget = `${backendProtocol}://${backendHost}:${backendPort}`
  
  console.log(`\n========================================`)
  console.log(`  Skill Swap Frontend`)
  console.log(`  Environment: ${mode}`)
  console.log(`  Frontend: http://localhost:${frontendPort}`)
  console.log(`  Backend Proxy: ${apiPrefix} -> ${backendTarget}`)
  console.log(`========================================\n`)
  
  return {
    plugins: [vue()],
    server: {
      port: frontendPort,
      proxy: {
        [apiPrefix]: {
          target: backendTarget,
          changeOrigin: true
        }
      }
    },
    define: {
      'import.meta.env.VITE_API_PREFIX': JSON.stringify(apiPrefix),
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(backendTarget)
    }
  }
})
