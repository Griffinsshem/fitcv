import { describe, expect, it } from 'vitest';
import { extractCvText, sniffKind } from '../src/modules/cv-import/extract';

describe('sniffKind', () => {
  it('detects files by magic bytes, not by name', () => {
    expect(sniffKind(Buffer.from('%PDF-1.7 ...'))).toBe('pdf');
    expect(
      sniffKind(
        Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('word/document.xml')]),
      ),
    ).toBe('docx');
    expect(sniffKind(Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00]))).toBeNull(); // plain zip
    expect(sniffKind(Buffer.from('<script>alert(1)</script>'))).toBeNull();
  });

  it('rejects unsupported files with a friendly error', async () => {
    await expect(extractCvText(Buffer.from('MZ executable'))).rejects.toThrow(/PDF or Word/);
  });
});
