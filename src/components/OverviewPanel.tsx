"use client";

import type { CSSProperties, DragEventHandler, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { Maximize2, Minimize2, PinOff } from "lucide-react";
import { PanelSurface } from "@/components/PanelSurface";

export type OverviewResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

const RESIZE_HANDLES: Array<{ direction: OverviewResizeDirection; label: string }> = [
  { direction: 'n', label: 'Resize panel vertically from top' },
  { direction: 'e', label: 'Resize panel horizontally from right' },
  { direction: 's', label: 'Resize panel vertically from bottom' },
  { direction: 'w', label: 'Resize panel horizontally from left' },
  { direction: 'ne', label: 'Resize panel horizontally and vertically from top right' },
  { direction: 'se', label: 'Resize panel horizontally and vertically from bottom right' },
  { direction: 'sw', label: 'Resize panel horizontally and vertically from bottom left' },
  { direction: 'nw', label: 'Resize panel horizontally and vertically from top left' },
];

interface OverviewPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  draggable?: boolean;
  onDragStart?: DragEventHandler<HTMLElement>;
  onUnpin?: () => void;
  onResizeStart?: (event: ReactPointerEvent<HTMLButtonElement>, direction: OverviewResizeDirection) => void;
  onResizeToggle?: () => void;
  isMaximized?: boolean;
  resizePreview?: string;
  panelId?: string;
  style?: CSSProperties;
}

export function OverviewPanel({
  title,
  children,
  className = "",
  draggable,
  onDragStart,
  onUnpin,
  onResizeStart,
  onResizeToggle,
  isMaximized = false,
  resizePreview,
  panelId,
  style,
}: OverviewPanelProps) {
  return (
    <PanelSurface
      className={`cdms-overview-panel ${className}`.trim()}
      bodyClassName="cdms-overview-panel-body"
      data-overview-panel={panelId}
      style={style}
      headerClassName={draggable ? 'is-draggable' : undefined}
      headerProps={{ draggable, onDragStart }}
      header={(
        <div className="cdms-overview-heading">
          {onUnpin && (
            <button
              type="button"
              className="cdms-overview-unpin"
              draggable={false}
              onPointerDown={(event) => event.stopPropagation()}
              onDragStart={(event) => event.preventDefault()}
              onClick={onUnpin}
              title="Unpin from overview"
              aria-label="Unpin from overview"
            >
              <PinOff size={13} />
            </button>
          )}
          <h3 className="cdms-overview-title">{title}</h3>
        </div>
      )}
      actions={onResizeToggle ? (
        <>
          <button
            type="button"
            draggable={false}
            onPointerDown={(event) => event.stopPropagation()}
            onDragStart={(event) => event.preventDefault()}
            onClick={onResizeToggle}
            title={isMaximized ? 'Restore panel size' : 'Expand panel'}
            aria-label={isMaximized ? 'Restore panel size' : 'Expand panel'}
          >
            {isMaximized ? <Minimize2 size={13} aria-hidden="true" /> : <Maximize2 size={13} aria-hidden="true" />}
          </button>
        </>
      ) : undefined}
    >
      {children}
      {resizePreview && <span className="cdms-overview-resize-preview">{resizePreview}</span>}
      {onResizeStart && !isMaximized && (
        <>
          {RESIZE_HANDLES.map(({ direction, label }) => (
            <button
              key={direction}
              type="button"
              className={`cdms-overview-resize-handle is-${direction}`}
              aria-label={label}
              title={label}
              onPointerDown={(event) => onResizeStart(event, direction)}
              onClick={(event) => event.preventDefault()}
              onDragStart={(event) => event.preventDefault()}
            />
          ))}
        </>
      )}
    </PanelSurface>
  );
}
