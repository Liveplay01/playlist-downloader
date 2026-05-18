import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { DOWNLOADS_DIR } from '../../config.js';

export async function zipJobDownloads(jobId: string, playlistTitle: string): Promise<string> {
  const dir = path.join(DOWNLOADS_DIR, jobId);
  const safeTitle = playlistTitle.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
  const zipPath = path.join(DOWNLOADS_DIR, `${jobId}-${safeTitle}.zip`);

  if (!fs.existsSync(dir)) throw new Error(`Download directory not found: ${dir}`);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 6 } });

  await new Promise<void>((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(dir, false);
    archive.finalize();
  });

  return zipPath;
}

export function getZipPath(jobId: string, playlistTitle: string): string {
  const safeTitle = playlistTitle.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
  return path.join(DOWNLOADS_DIR, `${jobId}-${safeTitle}.zip`);
}
