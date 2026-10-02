"use client";

import { useState, useMemo, useRef, useEffect, Fragment, type ReactNode } from "react";
import { Archive, ChevronDown, ChevronRight, CircleAlert, Pencil, Power } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ActionMenu";
import { CopyButton } from "@/components/CopyButton";
import { ConfirmationDialog } from "@/components/ConfirmationDialog";
import { ExpandedNoteRows, getRecordCriticalNotes, getRecordNotes } from "@/components/ExpandedNoteRows";
import { HiddenField } from "@/components/HiddenField";

export interface Column {
  key: string;
  label: string;
  type?: 'text' | 'password' | 'number' | 'date' | 'ip' | 'email' | 'url' | 'checkbox' | 'select';
  options?: string[];
  sortable?: boolean;
  filterable?: boolean;
  hidden?: boolean;
  editable?: boolean;
  width?: string; // CSS width value e.g., '100px', '8rem', etc.
  group?: string; // Group label for visually grouping related columns
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps {
  data: any[];
  columns: Column[];
  onAdd?: () => void;
  onNoteChange?: (row: any, columnKey: string, value: string) => Promise<boolean> | boolean;
  enableRowNotes?: boolean;
  onToggleActive?: (row: any, active: boolean) => Promise<boolean> | boolean;
  enableActivityToggle?: boolean;
  onInactivate?: (row: any) => Promise<boolean> | boolean;
  rowsPerPageOptions?: number[];
  enablePasswordMasking?: boolean;
  enableSearch?: boolean;
  enableFilters?: boolean;
  enableExport?: boolean;
  // Sort persistence props
  tableId?: string;
  defaultSort?: SortConfig;
  onSortChange?: (tableId: string, sortConfig: SortConfig | null) => void;
  // Inline editing props
  editable?: boolean;
  onCellEdit?: (row: any, columnKey: string, newValue: any, originalRow: any) => Promise<boolean> | boolean;
  // Expandable row props
  expandable?: boolean;
  expandedRowRenderer?: (row: any) => ReactNode;
  // Pagination control
  hidePagination?: boolean;
  variant?: 'default' | 'compact';
}

export function DataTable({
  data,
  columns,
  onAdd,
  onNoteChange,
  enableRowNotes = true,
  onToggleActive,
  enableActivityToggle = true,
  onInactivate,
  rowsPerPageOptions = [50, 100, 200],
  enablePasswordMasking = true,
  enableSearch = true,
  enableFilters = true,
  enableExport = true,
  tableId,
  defaultSort,
  onSortChange,
  editable = false,
  onCellEdit,
  expandable = false,
  expandedRowRenderer,
  hidePagination = false,
  variant = 'default',
}: DataTableProps) {
  const compact = variant === 'compact';
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(defaultSort || null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageOptions[0]);
  const [columnFilters] = useState<Record<string, string>>({});

  // Expandable rows state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpanded = (rowIndex: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [noteTarget, setNoteTarget] = useState<{ row: any; rowIndex: number; kind: 'standard' | 'critical' } | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<any | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  // Filter data based on search and column filters
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchQuery && enableSearch) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter(row =>
        columns.some(col => {
          const value = row[col.key];
          return value != null && String(value).toLowerCase().includes(lowerQuery);
        })
      );
    }

    // Apply column filters
    if (enableFilters) {
      Object.entries(columnFilters).forEach(([key, filterValue]) => {
        if (filterValue) {
          filtered = filtered.filter(row => {
            const value = row[key];
            return value != null && String(value).toLowerCase().includes(filterValue.toLowerCase());
          });
        }
      });
    }

    return filtered;
  }, [data, searchQuery, columnFilters, columns, enableSearch, enableFilters]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (hidePagination) return sortedData;
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, currentPage, rowsPerPage, hidePagination]);

  const totalPages = hidePagination ? 1 : Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      let newConfig: SortConfig | null;
      if (!prev || prev.key !== key) {
        newConfig = { key, direction: 'asc' };
      } else if (prev.direction === 'asc') {
        newConfig = { key, direction: 'desc' };
      } else {
        newConfig = null;
      }
      // Notify parent of sort change for persistence
      if (onSortChange && tableId) {
        onSortChange(tableId, newConfig);
      }
      return newConfig;
    });
  };

  const handleExport = () => {
    // Simple CSV export
    const headers = columns.filter(c => !c.hidden).map(c => c.label).join(',');
    const rows = sortedData.map(row =>
      columns.filter(c => !c.hidden).map(c => {
        const value = row[c.key];
        // Mask passwords in export
        if (c.type === 'password' && enablePasswordMasking) {
          return '••••••••';
        }
        return `"${value || ''}"`;
      }).join(',')
    ).join('\n');

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Checkbox toggle handler (single-click to toggle 0/1)
  const handleCheckboxToggle = async (rowIndex: number, columnKey: string, currentValue: any, row: any) => {
    if (!editable || !onCellEdit || isSaving) return;
    const newValue = currentValue === 1 ? 0 : 1;
    setIsSaving(true);
    try {
      await onCellEdit(row, columnKey, newValue, row);
    } catch (error) {
      console.error('Failed to toggle checkbox:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Inline editing handlers
  const handleCellDoubleClick = (rowIndex: number, columnKey: string, currentValue: any, column: Column) => {
    if (!editable || !onCellEdit) return;
    if (column.editable === false) return;

    setEditingCell({ rowIndex, columnKey });
    setEditValue(currentValue != null ? String(currentValue) : '');

  };

  const handleEditSave = async () => {
    if (!editingCell || !onCellEdit || isSaving) return;

    const row = paginatedData[editingCell.rowIndex];
    const originalValue = row[editingCell.columnKey];

    // Don't save if value hasn't changed
    if (String(originalValue || '') === editValue) {
      setEditingCell(null);
      setEditValue('');
      return;
    }

    setIsSaving(true);
    try {
      const success = await onCellEdit(row, editingCell.columnKey, editValue, row);
      if (success) {
        setEditingCell(null);
        setEditValue('');
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleEditSave();
    }
  };

  // Activity is represented by the row tint/menu toggle, and internal asset IDs stay out of table views.
  const visibleColumns = columns.filter(c => !c.hidden && !/^(active|is active|asset id)$/i.test(c.key.trim()));
  const isEditable = editable && onCellEdit;
  const noteChange = enableRowNotes
    ? (onNoteChange ?? (onCellEdit
      ? (row: any, columnKey: string, value: string) => onCellEdit(row, columnKey, value, row)
      : undefined))
    : undefined;
  const activityChange = enableActivityToggle
    ? (onToggleActive ?? (onCellEdit
      ? (row: any, active: boolean) => onCellEdit(row, 'Active', active ? 1 : 0, row)
      : undefined))
    : undefined;
  const hasActions = Boolean(noteChange || activityChange || onInactivate);
  const hasExpandControl = Boolean(noteChange || (expandable && expandedRowRenderer));
  const recordWithMetadata = (row: any) => row?._noteSource?.row ?? row?._original ?? row;
  const hasCriticalIndicators = data.some(row => getRecordCriticalNotes(recordWithMetadata(row)).length > 0);
  const hasLeadingControl = hasExpandControl || hasCriticalIndicators;

  const submitNote = async () => {
    const note = noteDraft.trim();
    if (!noteTarget || !noteChange || !note || isSavingNote) return;
    const sourceRecord = recordWithMetadata(noteTarget.row);
    const notePattern = noteTarget.kind === 'critical' ? /^Critical Notes?(?:\s+\d+)?$/i : /^Notes?(?:\s+\d+)?$/i;
    const existingNoteKeys = Object.keys(sourceRecord).filter(key => notePattern.test(key));
    const reusableKey = existingNoteKeys.find(key => !String(sourceRecord[key] ?? '').trim());
    const highestNoteNumber = existingNoteKeys.reduce((highest, key) => (
      Math.max(highest, Number(key.match(/\d+$/)?.[0] || 1))
    ), 0);
    const noteBase = noteTarget.kind === 'critical'
      ? 'Critical Note'
      : existingNoteKeys.some(key => /^Note(?:\s|$)/i.test(key) && !/^Notes/i.test(key)) ? 'Note' : 'Notes';
    const columnKey = reusableKey || (highestNoteNumber < 1 ? noteBase : `${noteBase} ${highestNoteNumber + 1}`);
    setIsSavingNote(true);
    try {
      const saved = await noteChange(noteTarget.row, columnKey, note);
      if (saved !== false) {
        if (noteTarget.kind === 'standard') {
          setExpandedRows(current => new Set(current).add(noteTarget.rowIndex));
        }
        setNoteTarget(null);
        setNoteDraft('');
      }
    } finally {
      setIsSavingNote(false);
    }
  };

  const confirmArchive = async () => {
    if (!archiveTarget || !onInactivate || isArchiving) return;
    setIsArchiving(true);
    try {
      const archived = await onInactivate(archiveTarget);
      if (archived !== false) setArchiveTarget(null);
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className={`flex flex-col h-full ${compact ? 'gap-0' : 'gap-4'}`}>
      {/* Toolbar */}
      {!compact && <div className="flex gap-3 flex-wrap items-center">
        {/* Search */}
        {enableSearch && (
          <input
            type="text"
            placeholder="Search all fields..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[250px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {onAdd && (
            <button
              onClick={onAdd}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors"
            >
              + Add New
            </button>
          )}
          {enableExport && (
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors"
            >
              Export CSV
            </button>
          )}
        </div>

        {/* Edit mode indicator */}
        {isEditable && (
          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
            Double-click cells to edit
          </div>
        )}
      </div>}

      {/* Table Container */}
      <div className={`flex-1 overflow-auto border border-gray-200 dark:border-gray-700 ${compact ? 'cdms-compact-table rounded-none' : 'rounded-md'}`}>
        <table className={`w-full border-collapse ${compact ? 'text-xs' : 'text-sm'}`}>
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-900 z-10">
            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
              {hasLeadingControl && <th className="w-16 min-w-16 bg-gray-50 px-1 py-2 dark:bg-gray-900" aria-label="Row details and alerts" />}
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} text-left font-semibold text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap select-none ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : ''}`}
                  style={col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width } : undefined}
                >
                  <div className="flex items-center gap-2">
                    {col.group && <span className="text-[0.6rem] text-gray-400 dark:text-gray-500 mr-1">{col.group}:</span>}
                    {col.label}
                    {sortConfig?.key === col.key && (
                      <span>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="sticky right-0 w-10 min-w-10 bg-gray-50 px-1 py-2 dark:bg-gray-900" aria-label="Row actions" />
              )}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => {
                const isExpanded = expandedRows.has(rowIndex);
                const isExpandableRow = Boolean(noteChange || (expandable && expandedRowRenderer));
                const activityRecord = recordWithMetadata(row);
                const criticalNotes = getRecordCriticalNotes(activityRecord);
                const isAffirmative = (value: any) => value === true || value === 1 || /^(1|true|yes|active|enabled)$/i.test(String(value ?? '').trim());
                const isActive = activityRecord?.Active !== undefined
                  ? isAffirmative(activityRecord.Active)
                  : !(isAffirmative(activityRecord?.Inactive) || isAffirmative(activityRecord?.['Is Inactive']));
                const totalCols = visibleColumns.length + (hasActions ? 1 : 0) + (hasLeadingControl ? 1 : 0);
                const rowActions: ActionMenuItem[] = [
                  ...(noteChange ? [{
                    label: 'Add note',
                    icon: <Pencil size={14} aria-hidden="true" />,
                    onSelect: () => {
                      setNoteTarget({ row, rowIndex, kind: 'standard' });
                      setNoteDraft('');
                    },
                  }, {
                    label: 'Add critical note',
                    icon: <CircleAlert size={14} aria-hidden="true" />,
                    tone: 'warning' as const,
                    onSelect: () => {
                      setNoteTarget({ row, rowIndex, kind: 'critical' });
                      setNoteDraft('');
                    },
                  }] : []),
                  ...(activityChange ? [{
                    label: isActive ? 'Mark inactive' : 'Mark active',
                    icon: <Power size={14} aria-hidden="true" />,
                    tone: isActive ? 'warning' as const : 'default' as const,
                    onSelect: async () => {
                      await activityChange(row, !isActive);
                    },
                  }] : []),
                  ...(onInactivate ? [{
                    label: 'Archive',
                    icon: <Archive size={14} aria-hidden="true" />,
                    tone: 'warning' as const,
                    onSelect: () => setArchiveTarget(row),
                  }] : []),
                ];

                return (
                  <Fragment key={rowIndex}>
                    <tr className={`cdms-data-row ${enableActivityToggle ? (isActive ? 'is-active' : 'is-inactive') : ''} border-b border-gray-100 dark:border-gray-700`}>
                      {hasLeadingControl && (
                        <td className="w-16 min-w-16 px-1 py-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {hasExpandControl && (
                              <button
                                type="button"
                                onClick={() => toggleRowExpanded(rowIndex)}
                                className="inline-flex h-7 w-7 items-center justify-center rounded text-gray-500 hover:bg-gray-200 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                                aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
                                aria-expanded={isExpanded}
                              >
                                {isExpanded ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
                              </button>
                            )}
                            {criticalNotes.length > 0 && (
                              <span className="group relative inline-flex">
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded text-red-600 hover:bg-red-100 focus-visible:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-red-400 dark:hover:bg-red-950/50 dark:focus-visible:bg-red-950/50"
                                  aria-label={`${criticalNotes.length} critical ${criticalNotes.length === 1 ? 'note' : 'notes'}`}
                                  title={criticalNotes.map(note => note.value).join('\n')}
                                >
                                  <CircleAlert size={17} strokeWidth={2.4} aria-hidden="true" />
                                </button>
                                <span role="tooltip" className="pointer-events-none absolute left-0 top-full z-50 mt-1 hidden w-72 whitespace-normal rounded-md border border-red-200 bg-white p-2 text-left text-xs font-normal text-gray-800 shadow-xl group-hover:block group-focus-within:block dark:border-red-900 dark:bg-gray-800 dark:text-gray-100">
                                  {criticalNotes.map((note, index) => (
                                    <span key={note.key} className="block border-b border-red-100 py-1 last:border-0 dark:border-red-900/60">
                                      <strong className="mr-1 text-red-600 dark:text-red-400">Critical {index + 1}:</strong>{note.value}
                                    </span>
                                  ))}
                                </span>
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                      {visibleColumns.map((col) => {
                        const value = row[col.key];
                        const isPassword = col.type === 'password';
                        const isCheckbox = col.type === 'checkbox';
                        const copyableFieldName = `${col.key} ${col.label}`.trim();
                        const isCopyableField = /(^|\s)(name|username|user name|login|email|phone|phone number)(\s|$)/i.test(copyableFieldName);
                        const isEditingThis = editingCell?.rowIndex === rowIndex && editingCell?.columnKey === col.key;
                        const isCellEditable = isEditable && col.editable !== false;

                        return (
                          <td
                            key={col.key}
                            onDoubleClick={() => !isCheckbox && isCellEditable && handleCellDoubleClick(rowIndex, col.key, value, col)}
                            className={`${compact ? 'px-2 py-2' : 'px-4 py-3'} ${col.width ? '' : 'max-w-[300px]'} overflow-hidden text-ellipsis whitespace-nowrap text-gray-900 dark:text-gray-100 ${col.type === 'ip' ? 'font-mono' : ''} ${isCheckbox ? 'text-center' : ''} ${isCellEditable && !isEditingThis && !isCheckbox ? 'cursor-text hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}`}
                            style={col.width ? { width: col.width, minWidth: col.width, maxWidth: col.width } : undefined}
                          >
                            {isCheckbox ? (
                              <input
                                type="checkbox"
                                checked={value === 1 || value === '1'}
                                onChange={() => isCellEditable && handleCheckboxToggle(rowIndex, col.key, value === 1 || value === '1' ? 1 : 0, row)}
                                disabled={!isCellEditable || isSaving}
                                className={`w-4 h-4 accent-blue-500 ${isCellEditable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                              />
                            ) : isEditingThis && col.type === 'select' && col.options ? (
                              <div className="relative">
                                <select
                                  value={editValue}
                                  onChange={(e) => { setEditValue(e.target.value); }}
                                  onBlur={handleEditSave}
                                  onKeyDown={handleEditKeyDown}
                                  disabled={isSaving}
                                  className={`min-w-[150px] px-2 py-1 text-sm border-2 border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none shadow-lg ${isSaving ? 'opacity-50' : ''}`}
                                  autoFocus
                                >
                                  <option value="">-- Select --</option>
                                  {col.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                            ) : isEditingThis ? (
                              <div className="relative">
                                <input
                                  ref={editInputRef}
                                  type={isPassword ? 'text' : col.type === 'number' ? 'number' : 'text'}
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={handleEditKeyDown}
                                  onBlur={handleEditSave}
                                  disabled={isSaving}
                                  className={`min-w-[200px] w-max px-2 py-1 text-sm border-2 border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none shadow-lg ${isSaving ? 'opacity-50' : ''}`}
                                  autoFocus
                                />
                                {isSaving && (
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-500 animate-pulse">...</span>
                                )}
                              </div>
                            ) : isPassword && enablePasswordMasking ? (
                              <HiddenField value={value} />
                            ) : col.type === 'url' && value ? (
                              <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300"
                              >
                                {value}
                              </a>
                            ) : isCopyableField && value ? (
                              <span className="inline-flex w-full min-w-[9rem] items-center justify-between gap-2">
                                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={String(value)}>{value}</span>
                                <CopyButton value={value} label={col.label.toLowerCase()} />
                              </span>
                            ) : (
                              <span title={String(value || '')}>{value || '-'}</span>
                            )}
                          </td>
                        );
                      })}
                      {hasActions && (
                        <td className="sticky right-0 w-10 min-w-10 bg-inherit px-1 py-1 text-center">
                          <ActionMenu items={rowActions} label="Row options" />
                        </td>
                      )}
                    </tr>
                    {isExpandableRow && isExpanded && (
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td colSpan={totalCols} className="px-3 py-1.5">
                          <div className="space-y-2">
                            {noteChange && (
                              <>
                                <ExpandedNoteRows
                                  notes={getRecordNotes(activityRecord)}
                                  onEdit={(columnKey, value) => noteChange(row, columnKey, value)}
                                  onDelete={(columnKey) => noteChange(row, columnKey, '')}
                                />
                                {criticalNotes.length > 0 && (
                                  <div className="rounded border border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20">
                                    <ExpandedNoteRows
                                      notes={criticalNotes}
                                      labelPrefix="Critical"
                                      onEdit={(columnKey, value) => noteChange(row, columnKey, value)}
                                      onDelete={(columnKey) => noteChange(row, columnKey, '')}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                            {expandedRowRenderer?.(row)}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={visibleColumns.length + (hasActions ? 1 : 0) + (hasLeadingControl ? 1 : 0)}
                  className="p-12 text-center text-gray-400 dark:text-gray-500 italic"
                >
                  {searchQuery || Object.keys(columnFilters).length > 0
                    ? 'No results found'
                    : 'No data available'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!hidePagination && <div className="flex justify-between items-center text-sm">
        <div className="text-gray-500 dark:text-gray-400">
          Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)} to{' '}
          {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} records
          {searchQuery || Object.keys(columnFilters).length > 0 ? ` (filtered from ${data.length} total)` : ''}
        </div>

        <div className="flex gap-2 items-center">
          <label className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            Rows per page:
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {rowsPerPageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Previous
          </button>
          <span className="px-2 text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-sm transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
          >
            Last
          </button>
        </div>
      </div>}

      {noteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/35 p-4" onMouseDown={() => !isSavingNote && setNoteTarget(null)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-note-title"
            className="w-full max-w-xl rounded-lg border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-800"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="add-note-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">{noteTarget.kind === 'critical' ? 'Add critical note' : 'Add note'}</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{noteTarget.kind === 'critical' ? 'This note will be flagged directly on the collapsed row.' : 'Add a detailed note to this record. It will appear in the expanded row.'}</p>
            <textarea
              autoFocus
              rows={6}
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && !isSavingNote) setNoteTarget(null);
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') submitNote();
              }}
              placeholder={noteTarget.kind === 'critical' ? 'Describe the critical issue…' : 'Enter note…'}
              className="mt-4 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/25 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" disabled={isSavingNote} onClick={() => setNoteTarget(null)} className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">Cancel</button>
              <button type="button" disabled={!noteDraft.trim() || isSavingNote} onClick={submitNote} className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${noteTarget.kind === 'critical' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSavingNote ? 'Saving…' : noteTarget.kind === 'critical' ? 'Add critical note' : 'Add note'}</button>
            </div>
          </section>
        </div>
      )}
      <ConfirmationDialog
        open={Boolean(archiveTarget)}
        title="Archive item?"
        description="This item will be marked as archived and hidden from the active view."
        confirmLabel="Archive"
        busyLabel="Archiving…"
        busy={isArchiving}
        tone="warning"
        onConfirm={confirmArchive}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      />
    </div>
  );
}
