import { badRequest } from '../../lib/errors';

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // below Vercel's 4.5 MB proxy body limit
const MAX_TEXT_CHARS = 30_000;

type Kind = 'pdf' | 'docx';

/**
 * Identify the file by its magic bytes, not by the client-supplied MIME type
 * or extension (both are attacker-controlled).
 */
export function sniffKind(buf: Buffer): Kind | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  // DOCX is a ZIP container: "PK\x03\x04", and must contain word/document.xml
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    if (buf.includes(Buffer.from('word/'))) return 'docx';
  }
  return null;
}

export async function extractCvText(buf: Buffer): Promise<string> {
  const kind = sniffKind(buf);
  if (!kind) throw badRequest('Upload a PDF or Word (.docx) file.');

  let text = '';
  try {
    if (kind === 'pdf') {
      const { PDFParse } = await import('pdf-parse');
      const parser = new PDFParse({ data: new Uint8Array(buf) });
      try {
        const result = await parser.getText({ first: 10 }); // cap pages processed
        text = result.text;
      } finally {
        await parser.destroy();
      }
    } else {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    }
  } catch {
    throw badRequest('We could not read that file. Try exporting it again as PDF or DOCX.');
  }

  text = text
    .replaceAll(String.fromCharCode(0), '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text.length < 100) {
    throw badRequest(
      'That file has almost no readable text (scanned image?). Upload a text-based PDF/DOCX or fill in the form.',
    );
  }
  return text.slice(0, MAX_TEXT_CHARS);
}
