import { readFile } from 'fs/promises';
import { extname } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Parsers
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');
import * as mammoth from 'mammoth';
import * as xlsx from 'xlsx';

export class DocumentProcessor {
  
  static async extractText(filePath: string, fileType: string): Promise<string> {
    const ext = extname(filePath).toLowerCase();
    
    // PDF
    if (ext === '.pdf' || fileType.includes('pdf')) {
      const dataBuffer = await readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      if (data.text.trim().length < 50) {
        console.log('PDF text is too short, assuming scanned PDF. Note: Backend OCR requires native canvas or imagemagick which is unavailable.');
        return data.text; // Return what little text we have.
      }
      
      return data.text;
    }
    
    // DOCX
    if (ext === '.docx' || fileType.includes('wordprocessingml')) {
      const dataBuffer = await readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    }
    
    // XLSX / XLS / CSV
    if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || fileType.includes('spreadsheetml') || fileType.includes('csv')) {
      const workbook = xlsx.readFile(filePath);
      let fullText = '';
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        fullText += `--- Sheet: ${sheetName} ---\n`;
        fullText += xlsx.utils.sheet_to_csv(sheet);
        fullText += '\n\n';
      }
      return fullText;
    }
    
    // Images (OCR)
    if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || fileType.includes('image')) {
      try {
        const workerPath = path.join(process.cwd(), 'scripts', 'ocr-worker.js');
        const { stdout } = await execAsync(`node "${workerPath}" "${filePath}"`);
        return stdout.trim();
      } catch (error) {
        console.error('OCR Error:', error);
        throw new Error('Failed to perform OCR on image.');
      }
    }
    
    // Fallback to plain text (txt, md, json, etc)
    const textBuffer = await readFile(filePath);
    return textBuffer.toString('utf-8');
  }
}
