import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parsePlaylistUrl } from '../services/parsers/index.js';

const bodySchema = z.object({ url: z.string().url() });

export async function playlistRoutes(app: FastifyInstance): Promise<void> {
  app.post('/api/playlist/parse', async (req, reply) => {
    const body = bodySchema.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Invalid URL' });

    try {
      const meta = await parsePlaylistUrl(body.data.url);
      return reply.send({ playlistMeta: meta });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Parse failed';
      return reply.status(422).send({ error: message });
    }
  });
}
