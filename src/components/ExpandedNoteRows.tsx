"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";

export interface ExpandedNote {
  key: string;
  value: string;
}

export function getRecordNotes(record: Record<string, any>): ExpandedNote[] {
  return Object.entries(record)
    .filter(([key, value]) => /^Notes?(?:\s+\d+)?$/i.test(key) && String(value ?? "").trim())
    .sort(([firstKey], [secondKey]) => {
      const noteNumber = (key: string) => Number(key.match(/\d+$/)?.[0] || 1);
      return noteNumber(firstKey) - noteNumber(secondKey);
    })
    .map(([key, value]) => ({ key, value: String(value) }));
}

export function getRecordCriticalNotes(record: Record<string, any>): ExpandedNote[] {
  return Object.entries(record)
    .filter(([key, value]) => /^Critical Notes?(?:\s+\d+)?$/i.test(key) && String(value ?? "").trim())
    .sort(([firstKey], [secondKey]) => {
      const noteNumber = (key: string) => Number(key.match(/\d+$/)?.[0] || 1);
      return noteNumber(firstKey) - noteNumber(secondKey);
    })
    .map(([key, value]) => ({ key, value: String(value) }));
}

interface ExpandedNoteRowsProps {
  notes: ExpandedNote[];
  onEdit: (key: string, value: string) => Promise<boolean> | boolean;
  onDelete: (key: string) => Promise<boolean> | boolean;
  labelPrefix?: string;
}

export function ExpandedNoteRows({ notes, onEdit, onDelete, labelPrefix = 'Note' }: ExpandedNoteRowsProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [notePendingDelete, setNotePendingDelete] = useState<ExpandedNote | null>(null);
  const cancelEditRef = useRef(false);

  const beginEdit = (note: ExpandedNote) => {
    cancelEditRef.current = false;
    setEditingKey(note.key);
    setDraft(note.value);
  };

  const cancelEdit = () => {
    cancelEditRef.current = true;
    setEditingKey(null);
    setDraft("");
  };

  const saveEdit = async (note: ExpandedNote) => {
    if (cancelEditRef.current || saving) return;
    const nextValue = draft.trim();
    if (!nextValue || nextValue === note.value) {
      setEditingKey(null);
      setDraft("");
      return;
    }

    setSaving(true);
    try {
      const saved = await onEdit(note.key, nextValue);
      if (saved !== false) {
        setEditingKey(null);
        setDraft("");
      }
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async () => {
    if (deletingKey || !notePendingDelete) return;
    const note = notePendingDelete;
    setDeletingKey(note.key);
    try {
      const deleted = await onDelete(note.key);
      if (deleted !== false) setNotePendingDelete(null);
    } finally {
      setDeletingKey(null);
    }
  };

  if (notes.length === 0) {
    return <p className="px-2 py-1 text-xs italic text-gray-400 dark:text-gray-500">No notes.</p>;
  }

  return (
    <>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {notes.map((note, index) => (
        <div key={note.key} className="grid grid-cols-[4.5rem_minmax(0,1fr)_2rem] items-start gap-2 px-2 py-1.5 text-sm">
          <span className="pt-1 text-xs font-medium text-gray-400">{labelPrefix} {index + 1}</span>
          {editingKey === note.key ? (
            <textarea
              autoFocus
              rows={2}
              value={draft}
              disabled={saving}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => saveEdit(note)}
              onKeyDown={(event) => {
                if (event.key === "Escape") cancelEdit();
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  event.preventDefault();
                  saveEdit(note);
                }
              }}
              className="min-h-12 w-full resize-y rounded border border-blue-500 bg-white px-2 py-1 text-sm text-gray-900 outline-none ring-2 ring-blue-500/20 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-100"
            />
          ) : (
            <p
              onDoubleClick={() => beginEdit(note)}
              title="Double-click to edit"
              className="min-w-0 cursor-text whitespace-pre-wrap break-words rounded px-2 py-1 text-gray-800 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-900/20"
            >
              {note.value}
            </p>
          )}
          <button
            type="button"
            disabled={Boolean(deletingKey)}
            onClick={() => setNotePendingDelete(note)}
            title={`Delete ${labelPrefix} ${index + 1}`}
            aria-label={`Delete ${labelPrefix} ${index + 1}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/40 dark:hover:text-red-400"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
        ))}
      </div>
      <ConfirmationDialog
        open={Boolean(notePendingDelete)}
        title={`Delete ${labelPrefix.toLowerCase()}?`}
        description={(
          <>
            <p>This permanently removes the note from this record.</p>
            {notePendingDelete?.value && (
              <blockquote className="mt-3 max-h-28 overflow-auto rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs italic text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                {notePendingDelete.value}
              </blockquote>
            )}
          </>
        )}
        confirmLabel="Delete note"
        busyLabel="Deleting…"
        busy={Boolean(deletingKey)}
        tone="danger"
        onConfirm={deleteNote}
        onOpenChange={(open) => !open && setNotePendingDelete(null)}
      />
    </>
  );
}
