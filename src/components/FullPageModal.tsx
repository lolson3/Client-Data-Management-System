"use client";

import { cloneElement, isValidElement, useEffect } from "react";
import { createPortal } from "react-dom";
import { CategoryPanel, type CategoryPanelProps } from "@/components/CategoryPanel";
import { PanelSurface } from "@/components/PanelSurface";

interface FullPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function FullPageModal({ isOpen, onClose, title, children }: FullPageModalProps) {
  const panelHost = isOpen && typeof document !== 'undefined'
    ? document.getElementById('dashboard-section-panel')
    : null;

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || !panelHost) return null;

  const categoryPanel = isValidElement<CategoryPanelProps>(children) && children.type === CategoryPanel
    ? children
    : null;
  const itemLabel = categoryPanel?.props.itemLabel || 'records';
  const itemCountLabel = categoryPanel?.props.itemCount !== undefined
    ? `${categoryPanel.props.itemCount} ${categoryPanel.props.itemCount === 1 ? itemLabel.replace(/s$/, '') : itemLabel}`
    : null;
  const panelContent = categoryPanel
    ? cloneElement(categoryPanel, { integratedHeader: true })
    : children;

  return createPortal(
      <PanelSurface
        className="cdms-panel"
        headerClassName="cdms-panel-header"
        bodyClassName="cdms-panel-content"
        header={(
          <div className="cdms-panel-title-block">
            <h2>{title}</h2>
            {categoryPanel?.props.description && (
              <>
                <span className="cdms-panel-title-divider" aria-hidden="true">|</span>
                <p>{categoryPanel.props.description}</p>
              </>
            )}
          </div>
        )}
        actions={itemCountLabel ? <span className="cdms-category-count">{itemCountLabel}</span> : undefined}
      >
        {panelContent}
      </PanelSurface>,
      panelHost
  );
}
