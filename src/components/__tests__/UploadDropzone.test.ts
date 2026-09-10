/**
 * UploadDropzone component tests (REQ-UI-20).
 *
 * Environment note: vitest.config.mts collects only `*.test.ts` under a `node`
 * environment, so this follows the repo precedent set by components.test.ts —
 * `React.createElement` + `renderToStaticMarkup`, no JSX and no jsdom.
 *
 * `react-dropzone` is mocked so the test can drive `onDropAccepted` /
 * `onDropRejected` directly instead of synthesizing DOM drag events. That also
 * keeps the assertion honest about WHERE responsibility sits: accept-list
 * filtering is react-dropzone's job, so we assert the component CONFIGURES it
 * correctly and that a rejected drop never reaches the server.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type DropzoneOptions = {
  accept?: Record<string, readonly string[]>;
  multiple?: boolean;
  onDropAccepted?: (files: File[]) => void;
  onDropRejected?: (rejections: readonly unknown[]) => void;
};

const captured: { options: DropzoneOptions | null } = { options: null };

vi.mock('react-dropzone', () => ({
  useDropzone: (options: DropzoneOptions) => {
    captured.options = options;
    return {
      getRootProps: () => ({}),
      getInputProps: () => ({}),
      isDragActive: false,
    };
  },
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('@/app/actions/ingestFromUpload', () => ({
  ingestFromUpload: vi.fn(),
}));
import { UploadDropzone } from '../UploadDropzone';

function csvFile(name: string): File {
  return new File(['Date,Description,Amount\n2026-03-01,Netflix,-15.99'], name, {
    type: 'text/csv',
  });
}

async function renderDropzone(): Promise<string> {
  return renderToStaticMarkup(createElement(UploadDropzone));
}

describe('UploadDropzone (REQ-UI-20)', () => {
  beforeEach(() => {
    captured.options = null;
    refresh.mockClear();
  });

  it('configures react-dropzone to accept only .csv and allow multiple files', async () => {
    await renderDropzone();

    expect(captured.options).not.toBeNull();
    expect(captured.options?.accept).toEqual({ 'text/csv': ['.csv'] });
    expect(captured.options?.multiple).toBe(true);
  });

  it('renders a keyboard-accessible button fallback alongside the drop area', async () => {
    const html = await renderDropzone();

    expect(html).toContain('<input');
    expect(html).toContain('<button');
  });

  it('an accepted .csv drop calls ingestFromUpload with the file under "files"', async () => {
    const { ingestFromUpload } = await import('@/app/actions/ingestFromUpload');
    vi.mocked(ingestFromUpload).mockResolvedValueOnce({
      ingested: 1,
      deduped: 0,
      skipped: 0,
      logPath: '/tmp/state/ingest.log',
      transactionCount: 1,
    });

    await renderDropzone();
    const file = csvFile('march.csv');
    captured.options?.onDropAccepted?.([file]);
    await vi.waitFor(() => expect(ingestFromUpload).toHaveBeenCalledTimes(1));

    const formData = vi.mocked(ingestFromUpload).mock.calls[0]![0];
    expect(formData).toBeInstanceOf(FormData);
    expect(formData.getAll('files')).toEqual([file]);
  });

  it('refreshes the router after a successful ingest', async () => {
    const { ingestFromUpload } = await import('@/app/actions/ingestFromUpload');
    vi.mocked(ingestFromUpload).mockResolvedValueOnce({
      ingested: 1,
      deduped: 0,
      skipped: 0,
      logPath: '/tmp/state/ingest.log',
      transactionCount: 1,
    });

    await renderDropzone();
    captured.options?.onDropAccepted?.([csvFile('march.csv')]);

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  });

  it('a rejected drop never reaches the server action', async () => {
    const { ingestFromUpload } = await import('@/app/actions/ingestFromUpload');
    vi.mocked(ingestFromUpload).mockClear();

    await renderDropzone();
    captured.options?.onDropRejected?.([
      { file: new File(['nope'], 'notes.txt', { type: 'text/plain' }), errors: [] },
    ]);

    expect(ingestFromUpload).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('a multi-file drop dispatches ONE FormData carrying both files', async () => {
    const { ingestFromUpload } = await import('@/app/actions/ingestFromUpload');
    vi.mocked(ingestFromUpload).mockClear();
    vi.mocked(ingestFromUpload).mockResolvedValueOnce({
      ingested: 2,
      deduped: 0,
      skipped: 0,
      logPath: '/tmp/state/ingest.log',
      transactionCount: 2,
    });

    await renderDropzone();
    const a = csvFile('march.csv');
    const b = csvFile('april.csv');
    captured.options?.onDropAccepted?.([a, b]);
    await vi.waitFor(() => expect(ingestFromUpload).toHaveBeenCalledTimes(1));

    const formData = vi.mocked(ingestFromUpload).mock.calls[0]![0];
    expect(formData.getAll('files')).toEqual([a, b]);
  });
});
