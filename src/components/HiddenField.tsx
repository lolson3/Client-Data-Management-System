"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface HiddenFieldProps {
  value: unknown;
  maskLength?: number;
  emptyValue?: string;
  className?: string;
}

export function HiddenField({
  value,
  maskLength = 8,
  emptyValue = '-',
  className = '',
}: HiddenFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const textValue = value == null ? '' : String(value);

  useEffect(() => {
    setRevealed(false);
  }, [textValue]);

  if (!textValue) return <span className={className}>{emptyValue}</span>;

  return (
    <span className={`inline-flex min-w-[9rem] items-center justify-between gap-2 ${className}`}>
      <span
        className="min-w-0 select-none overflow-hidden text-ellipsis whitespace-nowrap font-mono"
        title={revealed ? textValue : 'Hidden value'}
        onCopy={(event) => event.preventDefault()}
      >
        {revealed ? textValue : '•'.repeat(maskLength)}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="inline-grid h-7 w-7 place-items-center rounded border border-gray-300 bg-white text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          aria-label={revealed ? 'Hide value' : 'Reveal value'}
          title={revealed ? 'Hide value' : 'Reveal value'}
          onClick={(event) => {
            event.stopPropagation();
            setRevealed(current => !current);
          }}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          {revealed ? <EyeOff size={14} aria-hidden="true" /> : <Eye size={14} aria-hidden="true" />}
        </button>
        <CopyButton value={textValue} label="hidden value" />
      </span>
    </span>
  );
}
