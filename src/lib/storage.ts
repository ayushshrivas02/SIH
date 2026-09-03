import fs from 'fs';
import path from 'path';

export class Storage {
  static async saveImage(base64Data: string, filename: string): Promise<string> {
    const uploadDir = process.env.UPLOAD_STORAGE || './uploads';
    const filePath = path.join(uploadDir, filename);

    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Strip prefix if present
    const data = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');

    fs.writeFileSync(filePath, buffer);
    
    // In a real implementation this would return a public URL or S3 key
    // For local Next.js we can serve via static route or api route, but for simplicity here we just return the filename
    return `/api/images/${filename}`;
  }
}
