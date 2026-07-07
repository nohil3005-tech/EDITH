import { Document, Paragraph, Packer } from 'docx';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';

export interface FileToPackage {
  filename: string;
  content: string | Buffer;
}

export class FormatConverter {
  async convertToDocx(text: string): Promise<Buffer> {
    const lines = text.split('\n');
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: lines.map((line) => new Paragraph({ text: line })),
        },
      ],
    });
    return Packer.toBuffer(doc);
  }

  async convertToPdf(text: string): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        
        doc.fontSize(12).text(text, { align: 'left', lineGap: 4 });
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  async createZipArchive(files: FileToPackage[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: Buffer[] = [];

      archive.on('data', (chunk) => buffers.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', (err) => reject(err));

      for (const file of files) {
        const contentBuffer = typeof file.content === 'string' ? Buffer.from(file.content, 'utf8') : file.content;
        archive.append(contentBuffer, { name: file.filename });
      }

      archive.finalize();
    });
  }
}
export const formatConverter = new FormatConverter();
