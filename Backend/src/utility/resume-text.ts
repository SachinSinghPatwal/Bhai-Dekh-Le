import fs from 'node:fs/promises';
import path from 'node:path';
import logger from './logger.js';
import type { UserResume } from '../models/Mongo/user.models.js';

/**
 * Resume text extraction.
 *
 * Gemini can only score a resume against a job if it actually receives the
 * resume text. Previously anything that was not a .txt file silently produced
 * an empty string, which made every match score meaningless without any
 * visible error. This module does the real extraction for PDF and DOCX.
 *
 * `pdf-parse` and `mammoth` are loaded with dynamic `import()` so that a
 * missing optional dependency surfaces as a clear, actionable message on the
 * one request that needed it, instead of crashing the server at startup.
 */

export type ResumeKind = 'pdf' | 'docx' | 'doc' | 'text' | 'unknown';

/**
 * Classify a resume by MIME type first (more trustworthy) and fall back to the
 * file extension, since Cloudinary URLs and local paths do not always carry a
 * MIME type.
 */
export function detectResumeKind(hint?: string, fileName?: string): ResumeKind {
  const mime = (hint || '').toLowerCase();

  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime === 'application/msword') return 'doc';
  if (mime.startsWith('text/')) return 'text';

  const ext = path.extname(fileName || hint || '').toLowerCase();

  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.docx':
      return 'docx';
    case '.doc':
      return 'doc';
    case '.txt':
    case '.md':
    case '.text':
      return 'text';
    default:
      return 'unknown';
  }
}

/**
 * Collapse the ragged whitespace that PDF and DOCX extractors emit. Keeps
 * paragraph breaks, drops runs of blank lines and trailing spaces, so the
 * prompt sent to Gemini stays compact.
 */
function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function missingDependencyError(pkg: string, cause: unknown): Error {
  const error = new Error(
    `Cannot read this resume: the "${pkg}" package is not installed. Run "npm install" in Backend/ and try again.`
  );
  (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

/**
 * pdf-parse ships different shapes across versions and module systems: v1 is
 * CommonJS with a `default` interop wrapper, v2 exposes named exports. Worse,
 * v1's entry point runs a debug branch that reads a bundled sample PDF when it
 * thinks it is the main module — which is exactly what a dynamic import looks
 * like — so the internal `lib/pdf-parse.js` path is tried first.
 */
async function loadPdfParser(): Promise<(buffer: Buffer) => Promise<{ text: string }>> {
  const candidates = ['pdf-parse/lib/pdf-parse.js', 'pdf-parse'];
  let lastError: unknown;

  for (const specifier of candidates) {
    try {
      const mod: any = await import(specifier);
      const fn = mod?.default?.default ?? mod?.default ?? mod?.pdf ?? mod;

      if (typeof fn === 'function') {
        return fn;
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw missingDependencyError('pdf-parse', lastError);
}

async function loadDocxParser(): Promise<(input: { buffer: Buffer }) => Promise<{ value: string }>> {
  try {
    const mod: any = await import('mammoth');
    const extractRawText = mod?.extractRawText ?? mod?.default?.extractRawText;

    if (typeof extractRawText !== 'function') {
      throw new Error('mammoth.extractRawText is unavailable');
    }

    return extractRawText;
  } catch (error) {
    throw missingDependencyError('mammoth', error);
  }
}

/**
 * Extract plain text from an in-memory resume.
 *
 * `hint` should be the MIME type when one is available (e.g. from multer);
 * `fileName` is used to recover the type when it is not.
 */
export async function extractResumeTextFromBuffer(
  buffer: Buffer,
  hint?: string,
  fileName?: string
): Promise<string> {
  if (!buffer || buffer.length === 0) {
    return '';
  }

  const kind = detectResumeKind(hint, fileName);

  switch (kind) {
    case 'pdf': {
      const pdfParse = await loadPdfParser();
      const parsed = await pdfParse(buffer);
      return normalizeText(parsed?.text || '');
    }

    case 'docx': {
      const extractRawText = await loadDocxParser();
      const parsed = await extractRawText({ buffer });
      return normalizeText(parsed?.value || '');
    }

    case 'doc':
      // Legacy binary .doc is a different format that mammoth does not read.
      throw new Error(
        'Legacy .doc resumes are not supported. Please re-save the file as .docx, .pdf or .txt and upload again.'
      );

    case 'text':
      return normalizeText(buffer.toString('utf8'));

    default:
      throw new Error(
        `Unsupported resume format${fileName ? ` for "${fileName}"` : ''}. Supported formats: PDF, DOCX, TXT.`
      );
  }
}

/**
 * Extract plain text from a resume on disk. Returns '' when the file is
 * missing, since a not-yet-uploaded resume is a normal state rather than an
 * error, but propagates real parse failures so they are visible.
 */
export async function extractResumeTextFromFile(
  resumePath: string,
  hint?: string
): Promise<string> {
  let buffer: Buffer;

  try {
    buffer = await fs.readFile(resumePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      logger.warn('Resume file not found', { resumePath });
      return '';
    }
    throw error;
  }

  return extractResumeTextFromBuffer(buffer, hint, resumePath);
}

/**
 * Download a resume over HTTP (e.g. a Cloudinary secure URL) and extract its
 * text.
 */
export async function extractResumeTextFromUrl(
  url: string,
  hint?: string
): Promise<string> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to download resume (HTTP ${response.status} ${response.statusText})`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = hint || response.headers.get('content-type') || undefined;

  return extractResumeTextFromBuffer(buffer, contentType, url);
}

/**
 * Resolve the text of whichever resume a user actually has.
 *
 * Cloud storage is preferred when present (it is the copy that survives a
 * redeploy) and the local path is the fallback. Returns '' when the user has
 * no resume at all, and logs rather than throws on a parse failure so that a
 * bad resume degrades matching instead of aborting a long automation run.
 */
export async function extractUserResumeText(resume?: UserResume): Promise<string> {
  if (!resume) return '';

  try {
    if (resume.cloudinaryUrl) {
      return await extractResumeTextFromUrl(resume.cloudinaryUrl, resume.mimeType);
    }

    if (resume.path) {
      return await extractResumeTextFromFile(resume.path, resume.mimeType);
    }
  } catch (error) {
    logger.error('Failed to read stored resume', {
      error,
      storage: resume.storage,
      fileName: resume.fileName,
    });
    return '';
  }

  return '';
}
