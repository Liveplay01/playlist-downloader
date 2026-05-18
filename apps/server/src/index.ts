import Fastify from 'fastify';
import cors from '@fastify/cors';
import staticFiles from '@fastify/static';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, DOWNLOADS_DIR } from './config.js';
import { playlistRoutes } from './routes/playlist.js';
import { jobRoutes } from './routes/jobs.js';
import { sseRoutes } from './routes/sse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = Fastify({ logger: config.NODE_ENV === 'development' });

await app.register(cors, { origin: true });

fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

await app.register(playlistRoutes);
await app.register(jobRoutes);
await app.register(sseRoutes);

app.get('/health', async () => ({ ok: true }));

// Serve the built React frontend in production
if (config.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    await app.register(staticFiles, { root: clientDist, prefix: '/' });
    // SPA fallback: all non-API routes return index.html
    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile('index.html');
    });
  }
}

try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${config.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
