"use client";

import { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";

interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'ip' | 'email' | 'tel' | 'url' | 'textarea' | 'checkbox' | 'select' | 'phone-list';
  options?: string[];
  required?: boolean;
  defaultValue?: any;
  autoFill?: boolean; // Auto-filled and not editable (e.g., Client)
  visibleWhen?: { key: string; value: string }; // Only show this field when another field matches a value
}

interface ActionButton {
  label: string;
  disabled?: boolean;
  disabledReason?: string;
  onClick: () => Promise<Record<string, any> | null>;
}

interface AddRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FieldConfig[];
  onSave: (data: Record<string, any>) => Promise<boolean>;
  actionButton?: ActionButton;
}

export function AddRecordModal({ isOpen, onClose, title, fields, onSave, actionButton }: AddRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    fields.forEach(f => {
      initial[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? 0 : '');
    });
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [actionRunning, setActionRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reinitialize form data when modal opens to pick up latest defaultValues (e.g., selectedClient)
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, any> = {};
      fields.forEach(f => {
        initial[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? 0 : '');
      });
      setFormData(initial);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields (skip hidden fields)
    for (const field of fields) {
      if (field.visibleWhen && formData[field.visibleWhen.key]?.toLowerCase() !== field.visibleWhen.value.toLowerCase()) continue;
      if (field.type === 'phone-list') {
        const phoneLines = Array.isArray(formData[field.key]) ? formData[field.key] : [];
        const populatedLines = phoneLines
          .map((line: Record<string, any>, index: number) => ({ ...line, _lineIndex: index }))
          .filter((line: Record<string, any>) => line.Name || line.Number);
        const incompleteLine = populatedLines.find((line: Record<string, any>) =>
          !String(line.Number || '').trim() || (line._lineIndex > 0 && !String(line.Name || '').trim())
        );
        if (incompleteLine) {
          setError('Each added line needs a phone number, and additional lines need a name');
          return;
        }
        const normalizedNames = populatedLines.map((line: Record<string, any>) =>
          String(line.Name || (line._lineIndex === 0 ? 'Main Office' : '')).trim().toLowerCase()
        );
        if (new Set(normalizedNames).size !== normalizedNames.length) {
          setError('Each phone line needs a unique name');
          return;
        }
      }
      if (field.required && !field.autoFill && !formData[field.key]) {
        setError(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const success = await onSave(formData);
      if (success) {
        // Reset form
        const initial: Record<string, any> = {};
        fields.forEach(f => {
          initial[f.key] = f.defaultValue ?? (f.type === 'checkbox' ? 0 : '');
        });
        setFormData(initial);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          <div className="flex items-center gap-2">
            {actionButton && (
              <button
                type="button"
                disabled={actionButton.disabled || actionRunning}
                title={actionButton.disabled ? actionButton.disabledReason : actionButton.label}
                onClick={async () => {
                  setActionRunning(true);
                  setError(null);
                  try {
                    const result = await actionButton.onClick();
                    if (result) {
                      setFormData(prev => ({ ...prev, ...result }));
                    }
                  } catch (err: any) {
                    setError(err.message || 'Action failed');
                  } finally {
                    setActionRunning(false);
                  }
                }}
                className={`px-3 py-1.5 rounded text-xs font-medium border-none cursor-pointer ${
                  actionButton.disabled || actionRunning
                    ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {actionRunning ? 'Looking up...' : actionButton.label}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl leading-none border-none bg-transparent cursor-pointer"
            >
              x
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 flex flex-col gap-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {fields.map((field) => {
            // Skip fields whose visibility condition isn't met
            if (field.visibleWhen && formData[field.visibleWhen.key]?.toLowerCase() !== field.visibleWhen.value.toLowerCase()) {
              return null;
            }
            return (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                {field.required && !field.autoFill && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.autoFill ? (
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-600 dark:text-gray-400">
                  {formData[field.key]}
                </div>
              ) : field.type === 'phone-list' ? (
                <div className="flex flex-col gap-2">
                  {(Array.isArray(formData[field.key]) ? formData[field.key] : []).map((line: Record<string, any>, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={line.Name || ''}
                        onChange={(event) => {
                          const nextLines = [...formData[field.key]];
                          nextLines[index] = { ...line, Name: event.target.value };
                          handleChange(field.key, nextLines);
                        }}
                        className="min-w-0 flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={index === 0 ? 'Main Office' : 'Line name'}
                        aria-label={`Phone line ${index + 1} name`}
                      />
                      <input
                        type="tel"
                        value={line.Number || ''}
                        onChange={(event) => {
                          const nextLines = [...formData[field.key]];
                          nextLines[index] = { ...line, Number: event.target.value };
                          handleChange(field.key, nextLines);
                        }}
                        className="min-w-0 flex-[1.25] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Phone number"
                        aria-label={`Phone line ${index + 1} number`}
                      />
                      <button
                        type="button"
                        disabled={!Array.isArray(formData[field.key]) || formData[field.key].length === 1}
                        onClick={() => handleChange(field.key, formData[field.key].filter((_: unknown, lineIndex: number) => lineIndex !== index))}
                        className="p-2 rounded border border-gray-300 dark:border-gray-600 text-gray-500 hover:text-red-600 hover:border-red-300 dark:hover:text-red-400 dark:hover:border-red-700 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-500 disabled:hover:border-gray-300"
                        title={!Array.isArray(formData[field.key]) || formData[field.key].length === 1 ? 'At least one main phone field is kept available' : 'Remove phone line'}
                        aria-label={`Remove phone line ${index + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleChange(field.key, [...(Array.isArray(formData[field.key]) ? formData[field.key] : []), { Name: '', Number: '' }])}
                    className="self-start inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Plus size={14} /> Add phone line
                  </button>
                </div>
              ) : field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData[field.key] === 1}
                    onChange={(e) => handleChange(field.key, e.target.checked ? 1 : 0)}
                    className="w-4 h-4 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {formData[field.key] === 1 ? 'Yes' : 'No'}
                  </span>
                </label>
              ) : field.type === 'select' && field.options ? (
                <select
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select --</option>
                  {field.options.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'tel' ? 'tel' : 'text'}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={field.label}
                />
              )}
            </div>
            );
          })}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 border-none rounded text-sm text-white cursor-pointer font-medium ${saving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
