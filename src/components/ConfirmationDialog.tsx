"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  tone?: 'default' | 'warning' | 'danger';
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busyLabel = 'Working…',
  busy = false,
  tone = 'default',
  onConfirm,
  onOpenChange,
}: ConfirmationDialogProps) {
  const iconClasses = tone === 'danger'
    ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
    : tone === 'warning'
      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
      : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400';
  const confirmClasses = tone === 'danger'
    ? 'bg-red-600 hover:bg-red-700'
    : tone === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700'
      : 'bg-blue-600 hover:bg-blue-700';

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !busy && onOpenChange(nextOpen)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-[1px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[121] w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl outline-none dark:border-gray-700 dark:bg-gray-800"
          onEscapeKeyDown={(event) => busy && event.preventDefault()}
          onPointerDownOutside={(event) => busy && event.preventDefault()}
        >
          <div className="flex items-start gap-3 pr-8">
            <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
              <AlertTriangle size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <Dialog.Title className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
              <Dialog.Description asChild>
                <div className="mt-1.5 text-sm leading-5 text-gray-600 dark:text-gray-300">{description}</div>
              </Dialog.Description>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              disabled={busy}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              aria-label="Close confirmation"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </Dialog.Close>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <button type="button" disabled={busy} className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onConfirm()}
              className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-wait disabled:opacity-60 ${confirmClasses}`}
            >
              {busy ? busyLabel : confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
