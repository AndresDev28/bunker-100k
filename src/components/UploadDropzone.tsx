'use client';
/**
 * UploadDropzone — browser drag-and-drop CSV ingest surface (REQ-UI-20).
 *
 * REQ-UI-1/2: every visible string comes from @/lib/labels — zero inline literals.
 * R4: react-dropzone's root/input props give a keyboard-accessible button picker
 *     for free, so drag-and-drop is never the only way in.
 *
 * Pending state uses `useState` rather than `useTransition` (design §2.5). The
 * work here is an awaited server round-trip, not an expensive re-render, so the
 * pending flag should be urgent — deferring it is exactly what we do NOT want.
 * It is also the only shape testable under this repo's `react-dom/server`
 * harness, where a transition's `startTransition` throws by contract.
 */
import React, { useCallback, useState, type ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { ingestFromUpload } from '@/app/actions/ingestFromUpload';
import type { IngestResult } from '@/lib/types/ingest';
import {
  LABEL_UPLOAD_ACTIVE,
  LABEL_UPLOAD_BUSY,
  LABEL_UPLOAD_BUTTON,
  LABEL_UPLOAD_ERROR,
  LABEL_UPLOAD_PROMPT,
  labelUploadResult,
} from '@/lib/labels';

const FILES_FIELD = 'files';

export function UploadDropzone(): ReactNode {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  const onDropAccepted = useCallback(
    async (files: readonly File[]): Promise<void> => {
      setError(null);
      setResult(null);
      setIsPending(true);
      try {
        // One FormData for the whole batch — the Server Action fans out over
        // getAll('files'), so a multi-file drop costs a single round-trip.
        const formData = new FormData();
        for (const file of files) formData.append(FILES_FIELD, file);

        const ingestResult = await ingestFromUpload(formData);
        setResult(ingestResult);
        router.refresh();
      } catch {
        setError(LABEL_UPLOAD_ERROR);
      } finally {
        setIsPending(false);
      }
    },
    [router],
  );

  const onDropRejected = useCallback((): void => {
    // react-dropzone owns accept-list filtering; a rejected drop must never
    // reach the server.
    setError(LABEL_UPLOAD_ERROR);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
    onDropAccepted,
    onDropRejected,
  });

  const resultIsPartial = result !== null && result.skipped > 0;

  return (
    <section className="mb-6">
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-zinc-600 dark:border-zinc-400 rounded-lg p-8 text-center cursor-pointer"
      >
        <input {...getInputProps()} />
        <p className="text-sm text-zinc-400">
          {isDragActive ? LABEL_UPLOAD_ACTIVE : LABEL_UPLOAD_PROMPT}
        </p>
        <button type="button" disabled={isPending} className="mt-3 underline text-sm">
          {isPending ? LABEL_UPLOAD_BUSY : LABEL_UPLOAD_BUTTON}
        </button>
      </div>
      {error === null ? null : <p className="mt-2 text-sm text-red-400">{error}</p>}
      {result === null ? null : (
        <p
          className={
            resultIsPartial ? 'mt-2 text-sm text-yellow-400' : 'mt-2 text-sm text-emerald-400'
          }
        >
          {labelUploadResult(result)}
        </p>
      )}
    </section>
  );
}
