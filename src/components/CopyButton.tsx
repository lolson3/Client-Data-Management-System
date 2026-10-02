"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

async function writeToClipboard(text: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through for browsers or contexts where Clipboard API access is denied.
    }
  }

  if (typeof document === 'undefined') throw new Error('Clipboard access is unavailable');

  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const selection = document.getSelection();
  const selectedRanges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : [];
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.inset = '0 auto auto -9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    if (!document.execCommand('copy')) throw new Error('Browser rejected the copy command');
  } finally {
    textarea.remove();
    if (selection) {
      selection.removeAllRanges();
      selectedRanges.forEach(range => selection.addRange(range));
    }
    activeElement?.focus({ preventScroll: true });
  }
}

interface CopyButtonProps {
  value: unknown;
  label?: string;
}

export function CopyButton({ value, label = 'value' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textValue = value == null ? '' : String(value);

  useEffect(() => setCopied(false), [textValue]);
  useEffect(() => () => {
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
  }, []);

  if (!textValue) return null;

  const copyValue = async () => {
    try {
      await writeToClipboard(textValue);
      setCopied(true);
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
      copiedTimeoutRef.current = setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error(`Unable to copy ${label}:`, error);
    }
  };

  return (
    <button
      type="button"
      className="inline-grid h-7 w-7 shrink-0 place-items-center rounded border border-gray-300 bg-white text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      onClick={(event) => {
        event.stopPropagation();
        void copyValue();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    </button>
  );
}
