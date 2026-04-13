import express from 'express'
import cors from 'cors'
import taskRoutes from './routes/tasks.js'
import { initDataDir } from './services/taskService.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/tasks', taskRoutes)

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('[solo-task] 服务器错误:', err.message)
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
    })
  }
)

async function start() {
  await initDataDir()
  app.listen(PORT, () => {
    console.log(`[solo-task] 服务运行在 http://localhost:${PORT}`)
  })
}

start()
