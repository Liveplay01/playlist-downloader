import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { Quality } from '@playlist-dl/shared';
import { parsePlaylistUrl } from '../services/parsers/index.js';
import { createJob, getJob, deleteJob, abortJob } from '../store/jobs.js';
import { processJob } from '../services/queue/worker.js';
import { getZipPath } from '../services/packager/zipper.js';
import { DOWNLOADS_DIR } from '../config.js';

const trackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string().default(''),
  durationMs: z.number().default(0),
  platform: z.string(),
  searchQuery: z.string(),
});

const createJobSchema = z.object({
  url: z.string().url(),
  quality: z.enum(['lossless', '320', '256', '128']).default('lossless'),
  // Pre-parsed playlist — skip re-fetching if provided
  playlistTitle: z.string().optional(),
  tracks: z.array(trackSchema).optional(),
});

export async function jobRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/jobs', async (req, reply) => {
    const body = createJobSchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid request' });

    let meta: { title: string; trackCount: number; tracks: any[] };

    if (body.data.tracks && body.data.tracks.length > 0) {
      // Use pre-parsed tracks from client — instant start, no re-fetching
      meta = {
        title: body.data.playlistTitle ?? 'Playlist',
        trackCount: body.data.tracks.length,
        tracks: body.data.tracks,
      };
    } else {
      // Fallback: parse from URL (slow for browser-scraped sources)
      try {
        const parsed = await parsePlaylistUrl(body.data.url);
        meta = { title: parsed.title, trackCount: parsed.trackCount, tracks: parsed.tracks };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Parse failed';
        return reply.status(422).send({ error: message });
      }
    }

    const jobId = uuidv4();
    createJob(jobId, { ...meta, platform: (meta.tracks[0]?.platform ?? 'spotify') as any });
    processJob(jobId, meta.tracks, body.data.quality as Quality).catch(err =>
      console.error(`Job ${jobId} failed:`, err)
    );

    return reply.status(201).send({
      jobId, status: 'queued',
      playlistTitle: meta.title,
      totalTracks: meta.trackCount,
      tracks: meta.tracks,
    });
  });

  app.get('/api/jobs/:jobId', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const job = getJob(jobId);
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    return reply.send(job);
  });

  app.get('/api/jobs/:jobId/download', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const job = getJob(jobId);
    if (!job) return reply.status(404).send({ error: 'Job not found' });
    if (job.status !== 'done') return reply.status(425).send({ error: 'Not ready yet' });

    const zipPath = getZipPath(jobId, job.playlistTitle);
    if (!fs.existsSync(zipPath)) return reply.status(404).send({ error: 'ZIP not found' });

    const safeTitle = job.playlistTitle.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
    reply.header('Content-Disposition', `attachment; filename="${safeTitle}.zip"`);
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Length', fs.statSync(zipPath).size);

    const stream = fs.createReadStream(zipPath);
    stream.on('end', () => {
      fs.rm(zipPath, { force: true }, () => {});
      deleteJob(jobId);
    });
    return reply.send(stream);
  });

  app.delete('/api/jobs/:jobId', async (req, reply) => {
    const { jobId } = req.params as { jobId: string };
    const job = getJob(jobId);
    if (!job) return reply.status(204).send();

    abortJob(jobId);
    fs.rm(path.join(DOWNLOADS_DIR, jobId), { recursive: true, force: true }, () => {});
    fs.rm(getZipPath(jobId, job.playlistTitle), { force: true }, () => {});
    deleteJob(jobId);

    return reply.status(204).send();
  });
}
