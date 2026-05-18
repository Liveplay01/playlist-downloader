import { z } from 'zod';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('4500').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  FLARESOLVERR_URL: z.string().optional(),
  DOWNLOADS_DIR: z.string().default('./downloads'),
  MAX_CONCURRENT_DOWNLOADS: z.string().default('1').transform(Number),
});

export const config = envSchema.parse(process.env);

export const DOWNLOADS_DIR = path.resolve(process.cwd(), config.DOWNLOADS_DIR);
