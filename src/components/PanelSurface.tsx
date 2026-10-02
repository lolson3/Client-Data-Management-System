"use client";

import type { HTMLAttributes, ReactNode } from "react";

interface PanelSurfaceProps extends HTMLAttributes<HTMLElement> {
  header?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  headerClassName?: string;
  headerProps?: HTMLAttributes<HTMLElement>;
  bodyClassName?: string;
}

export function PanelSurface({
  header,
  actions,
  children,
  className = "",
  headerClassName = "",
  headerProps,
  bodyClassName = "",
  ...sectionProps
}: PanelSurfaceProps) {
  return (
    <section className={`cdms-panel-surface ${className}`.trim()} {...sectionProps}>
      {(header || actions) && (
        <header className={`cdms-panel-surface-header ${headerClassName}`.trim()} {...headerProps}>
          <div className="cdms-panel-surface-heading">{header}</div>
          {actions && <div className="cdms-panel-surface-actions">{actions}</div>}
        </header>
      )}
      <div className={`cdms-panel-surface-body ${bodyClassName}`.trim()}>{children}</div>
    </section>
  );
}
