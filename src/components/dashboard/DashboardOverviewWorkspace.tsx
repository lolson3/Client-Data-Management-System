"use client";

import type { DragEvent, RefObject } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { OverviewPanel, type OverviewResizeDirection } from "@/components/OverviewPanel";
import {
  CATEGORY_OVERVIEW_PANELS,
  CURATED_OVERVIEW_PANELS,
  MAX_OVERVIEW_PANELS,
  type OverviewInteraction,
} from "@/components/dashboard/dashboardConfig";
import type { OverviewLayoutItem } from "@/lib/overviewLayout";

export interface OverviewPanelContent {
  title: string;
  data: any[];
  columns: Column[];
}

interface DashboardOverviewWorkspaceProps {
  hasSelectedClient: boolean;
  hasOpenCategory: boolean;
  loadingData: boolean;
  overviewPickerOpen: boolean;
  overviewPickerMenuRef: RefObject<HTMLDivElement | null>;
  overviewGridRef: RefObject<HTMLDivElement | null>;
  overviewLayout: OverviewLayoutItem[];
  overviewInteraction: OverviewInteraction | null;
  maximizedOverviewPanel: string | null;
  panelCatalog: Record<string, OverviewPanelContent>;
  onAddPanel: (panelId: string) => void;
  onPreviewDrop: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  onDragStart: (event: DragEvent<HTMLElement>, panelId: string) => void;
  onResizeStart: (event: React.PointerEvent<HTMLButtonElement>, panelId: string, direction: OverviewResizeDirection) => void;
  onTogglePanelSize: (panelId: string) => void;
  onUnpinPanel: (panelId: string) => void;
}

export function DashboardOverviewWorkspace({
  hasSelectedClient,
  hasOpenCategory,
  loadingData,
  overviewPickerOpen,
  overviewPickerMenuRef,
  overviewGridRef,
  overviewLayout,
  overviewInteraction,
  maximizedOverviewPanel,
  panelCatalog,
  onAddPanel,
  onPreviewDrop,
  onDrop,
  onDragStart,
  onResizeStart,
  onTogglePanelSize,
  onUnpinPanel,
}: DashboardOverviewWorkspaceProps) {
  if (hasSelectedClient && hasOpenCategory) {
    return <div id="dashboard-section-panel" className="flex-1 min-h-0" />;
  }

  if (!hasSelectedClient) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800 rounded-md">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">Select a client to view data</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500">Choose a client from the dropdown above</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cdms-overview-workspace" onDragOver={onPreviewDrop} onDrop={onDrop}>
      {overviewPickerOpen && !maximizedOverviewPanel && overviewLayout.length < MAX_OVERVIEW_PANELS && (
        <div id="overview-panel-picker" ref={overviewPickerMenuRef} className="cdms-overview-picker-menu" role="dialog" aria-label="Add an overview panel">
          <header>
            <span><strong>Add panel</strong><small>Choose an available view</small></span>
            <b>{overviewLayout.length}/{MAX_OVERVIEW_PANELS}</b>
          </header>
          <div className="cdms-overview-picker-list">
            {CURATED_OVERVIEW_PANELS.some(option => !overviewLayout.some(item => item.id === option.id)) && (
              <section>
                <h3>Curated views</h3>
                {CURATED_OVERVIEW_PANELS.filter(option => !overviewLayout.some(item => item.id === option.id)).map(option => (
                  <button type="button" key={option.id} onClick={() => onAddPanel(option.id)}>
                    <span><strong>{option.title}</strong><small>{option.description}</small></span>
                    <em>{option.source}</em>
                  </button>
                ))}
              </section>
            )}
            <section>
              <h3>Categories</h3>
              {CATEGORY_OVERVIEW_PANELS.filter(option => !overviewLayout.some(item => item.id === option.id)).map(option => (
                <button type="button" key={option.id} onClick={() => onAddPanel(option.id)}>
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <em>{option.source}</em>
                </button>
              ))}
            </section>
          </div>
        </div>
      )}
      <div className={`cdms-overview-grid ${maximizedOverviewPanel ? "is-maximized" : ""} ${overviewInteraction ? `is-${overviewInteraction.type}` : ""}`} ref={overviewGridRef}>
        {(maximizedOverviewPanel
          ? overviewLayout.filter(item => item.id === maximizedOverviewPanel)
          : overviewLayout
        ).map(item => {
          const panel = panelCatalog[item.id];
          if (!panel) return null;
          const isMaximized = maximizedOverviewPanel === item.id;
          const isDropPreview = overviewInteraction?.type === "drag" && overviewInteraction.targetId === item.id;
          const isInteracting = overviewInteraction?.type === "drag" && overviewInteraction.panelId === item.id;
          return (
            <OverviewPanel
              key={item.id}
              panelId={item.id}
              title={panel.title}
              className={`${isMaximized ? "is-maximized" : ""} ${isDropPreview ? "is-drop-preview" : ""} ${isInteracting ? "is-interacting" : ""}`}
              draggable={!isMaximized}
              style={isMaximized
                ? { gridColumn: "1 / -1", gridRow: "1 / -1" }
                : { gridColumn: `${item.column} / span ${item.columns}`, gridRow: `${item.row} / span ${item.rows}` }}
              onDragStart={event => onDragStart(event, item.id)}
              onResizeStart={(event, direction) => onResizeStart(event, item.id, direction)}
              onResizeToggle={() => onTogglePanelSize(item.id)}
              isMaximized={isMaximized}
              resizePreview={overviewInteraction?.type === "resize" && overviewInteraction.panelId === item.id
                ? `${overviewInteraction.columns} × ${overviewInteraction.rows}`
                : undefined}
              onUnpin={() => onUnpinPanel(item.id)}
            >
              {loadingData ? (
                <p className="cdms-overview-empty">Loading…</p>
              ) : panel.data.length > 0 ? (
                <DataTable
                  data={panel.data}
                  columns={panel.columns}
                  enablePasswordMasking
                  enableSearch={false}
                  enableFilters={false}
                  enableExport={false}
                  hidePagination
                  variant="compact"
                />
              ) : (
                <p className="cdms-overview-empty">No data</p>
              )}
            </OverviewPanel>
          );
        })}
        {overviewLayout.length === 0 && (
          <div className="cdms-overview-drop-empty">Use the + beside Overview or drag a category from the sidebar to pin it here.</div>
        )}
      </div>
    </div>
  );
}
