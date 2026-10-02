"use client";

import type { ReactNode } from "react";

export interface CategoryPanelProps {
  description: string;
  itemCount?: number;
  itemLabel?: string;
  summary?: ReactNode;
  children: ReactNode;
  integratedHeader?: boolean;
}

export function CategoryPanel({
  description,
  itemCount,
  itemLabel = "records",
  summary,
  children,
  integratedHeader = false,
}: CategoryPanelProps) {
  return (
    <section className="cdms-category-panel">
      {!integratedHeader && (
        <header className="cdms-category-panel-header">
          <p>{description}</p>
          {itemCount !== undefined && (
            <span className="cdms-category-count">
              {itemCount} {itemCount === 1 ? itemLabel.replace(/s$/, "") : itemLabel}
            </span>
          )}
        </header>
      )}
      {summary && <div className="cdms-category-summary">{summary}</div>}
      <div className="cdms-category-panel-content">{children}</div>
    </section>
  );
}
