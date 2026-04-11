import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as fs   from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Local disk storage — files saved to <cwd>/uploads/<folder>/
 * Served at https://api.lo9in.com/uploads/<folder>/<file>
 *
 * Set in .env:
 *   API_URL=https://api.lo9in.com
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger    = new Logger(StorageService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly baseUrl   = (process.env.API_URL || 'http://localhost:3001').replace(/\/$/, '');

  onModuleInit() {
    for (const folder of ['covers', 'scholars', 'volumes']) {
      const dir = path.join(this.uploadDir, folder);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        this.logger.log(`Created upload dir: ${dir}`);
      }
    }
    this.logger.log(`Local storage ready → ${this.uploadDir}`);
    this.logger.log(`Public base URL    → ${this.baseUrl}/uploads/`);
  }

  private sanitise(original: string): string {
    const parts = original.split('.');
    const ext   = (parts.length > 1 ? parts.pop()! : 'bin').toLowerCase().slice(0, 10);
    const base  = parts
      .join('-')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80) || 'file';
    return `${base}.${ext}`;
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    if (!file?.buffer?.length) {
      throw new InternalServerErrorException('File buffer is empty');
    }

    const folderPath = path.join(this.uploadDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    const filename = `${uuidv4()}-${this.sanitise(file.originalname)}`;
    const filePath = path.join(folderPath, filename);
    const sizeMB   = (file.size / 1_048_576).toFixed(2);

    this.logger.log(`Saving ${folder}/${filename} (${sizeMB} MB)…`);
    await fs.promises.writeFile(filePath, file.buffer);
    this.logger.log(`Saved OK: ${folder}/${filename}`);

    return `${this.baseUrl}/uploads/${folder}/${filename}`;
  }

  // No signing needed for local disk — URL is already public
  async getSignedUrl(fileUrl: string, _expiresIn = 3_600): Promise<string> {
    return fileUrl;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (!fileUrl) return;

    let filePath: string;
    if (fileUrl.startsWith('http')) {
      try {
        const u        = new URL(fileUrl);
        const relative = u.pathname.replace(/^\/uploads\//, '');
        filePath       = path.join(this.uploadDir, relative);
      } catch { return; }
    } else {
      filePath = path.join(this.uploadDir, fileUrl);
    }

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`Deleted: ${filePath}`);
      }
    } catch (e: any) {
      this.logger.warn(`Delete failed ${filePath}: ${e.message}`);
    }
  }
}
