import { FastifyInstance } from 'fastify';
import { getJob, subscribe } from '../store/jobs.js';
import { ProgressEvent } from '@playlist-dl/shared';

export async function sseRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/jobs/:jobId/progress', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const job = getJob(jobId);
    if (!job) return reply.status(404).send({ error: 'Job not found' });

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    });

    const send = (event: ProgressEvent) => {
      try {
        reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch {}
    };

    // Send current state immediately on connect (handles reconnect)
    send({ type: 'job_update', job });

    // If already done, send done event and close
    if (job.status === 'done' && job.downloadUrl) {
      send({ type: 'done', jobId, downloadUrl: job.downloadUrl });
      reply.raw.end();
      return;
    }

    // Subscribe to future updates
    const unsubscribe = subscribe(jobId, send);

    // Keep-alive ping every 20 seconds
    const pingInterval = setInterval(() => {
      try {
        reply.raw.write(': ping\n\n');
      } catch {
        clearInterval(pingInterval);
      }
    }, 20_000);

    // Cleanup on client disconnect
    req.raw.on('close', () => {
      clearInterval(pingInterval);
      unsubscribe();
    });

    // Never call reply.send() — keep stream open
    await new Promise<void>(resolve => req.raw.on('close', resolve));
  });
}
