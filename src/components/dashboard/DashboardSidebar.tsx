"use client";

import { useState, type DragEvent, type RefObject } from "react";
import {
  AppWindow,
  Boxes,
  Camera,
  ChevronDown,
  Contact,
  FileChartColumn,
  Globe,
  HardDrive,
  KeyRound,
  LayoutDashboard,
  Mail,
  Monitor,
  NotebookPen,
  Plus,
  Printer,
  Search,
  Server,
  Users,
  Workflow,
} from "lucide-react";
import { EthernetIcon } from "@/components/dashboard/DashboardIcons";
import { MAX_OVERVIEW_PANELS } from "@/components/dashboard/dashboardConfig";

export interface WorkspaceSearchSuggestion {
  section: string;
  modal: string;
  field: string;
  value: string;
  record: string;
}

interface DashboardSidebarProps {
  selectedClient: boolean;
  loadingData: boolean;
  openModal: string | null;
  onOpenModal: (modal: string | null) => void;
  workspaceSearch: string;
  onWorkspaceSearchChange: (value: string) => void;
  onWorkspaceSearchSubmit: () => void;
  workspaceSearchResults: WorkspaceSearchSuggestion[];
  overviewLayoutCount: number;
  overviewPickerOpen: boolean;
  onOverviewPickerOpenChange: (open: boolean) => void;
  overviewPickerRef: RefObject<HTMLDivElement | null>;
  suppressClickUntilRef: RefObject<number>;
  onBeginOverviewDrag: (event: DragEvent<HTMLButtonElement>, panelId: string) => void;
}

interface NavigationItemProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  openModal: string | null;
  selectedClient: boolean;
  onOpenModal: (modal: string) => void;
  onBeginOverviewDrag: (event: DragEvent<HTMLButtonElement>, panelId: string) => void;
  parent?: boolean;
  draggable?: boolean;
}

function NavigationItem({
  id,
  label,
  icon,
  openModal,
  selectedClient,
  onOpenModal,
  onBeginOverviewDrag,
  parent = false,
  draggable = true,
}: NavigationItemProps) {
  return (
    <button
      className={`cdms-nav-item ${parent ? "cdms-nav-parent-select" : ""} ${openModal === id ? "active" : ""}`}
      onClick={() => onOpenModal(id)}
      draggable={draggable && selectedClient && openModal === null}
      onDragStart={event => onBeginOverviewDrag(event, id)}
      disabled={!selectedClient}
    >
      <span className="cdms-nav-icon">{icon}</span>
      {label}
    </button>
  );
}

export function DashboardSidebar({
  selectedClient,
  loadingData,
  openModal,
  onOpenModal,
  workspaceSearch,
  onWorkspaceSearchChange,
  onWorkspaceSearchSubmit,
  workspaceSearchResults,
  overviewLayoutCount,
  overviewPickerOpen,
  onOverviewPickerOpenChange,
  overviewPickerRef,
  suppressClickUntilRef,
  onBeginOverviewDrag,
}: DashboardSidebarProps) {
  const [usersExpanded, setUsersExpanded] = useState(true);
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const [systemsExpanded, setSystemsExpanded] = useState(true);

  const navigationItemProps = {
    openModal,
    selectedClient,
    onOpenModal: (modal: string) => onOpenModal(modal),
    onBeginOverviewDrag,
  };

  return (
    <aside
      className="cdms-sidebar"
      aria-label="Client data navigation"
      onClickCapture={event => {
        if (Date.now() < suppressClickUntilRef.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClickUntilRef.current = 0;
        }
      }}
    >
      <div className="cdms-workspace-search">
        <div className="cdms-workspace-search-input">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            value={workspaceSearch}
            onChange={event => onWorkspaceSearchChange(event.target.value)}
            onKeyDown={event => {
              if (event.key === "Escape") onWorkspaceSearchChange("");
              if (event.key === "Enter" && workspaceSearch.trim()) {
                event.preventDefault();
                onWorkspaceSearchSubmit();
              }
            }}
            placeholder={selectedClient ? "Find fields or values…" : "Select a client first"}
            aria-label="Search fields and values for the selected client"
            aria-controls="workspace-search-results"
            disabled={!selectedClient || loadingData}
          />
        </div>
        {workspaceSearch.trim() && (
          <div id="workspace-search-results" className="cdms-workspace-search-results" role="listbox">
            <div className="cdms-client-suggestions-head">
              <span>Matches</span>
              <small>{workspaceSearchResults.length}</small>
            </div>
            {workspaceSearchResults.length > 0 ? workspaceSearchResults.map((result, index) => (
              <button
                key={`${result.modal}-${result.field}-${result.value}-${index}`}
                type="button"
                role="option"
                aria-selected="false"
                className="cdms-workspace-search-result"
                onClick={() => {
                  onOpenModal(result.modal);
                  onWorkspaceSearchChange("");
                }}
              >
                <span className="cdms-workspace-search-result-head">
                  <strong>{result.section}</strong>
                  <small>{result.field}</small>
                </span>
                <span>{result.value}</span>
                {result.record !== result.value && <small>{result.record}</small>}
              </button>
            )) : (
              <div className="cdms-client-empty">No fields or values match “{workspaceSearch}”</div>
            )}
          </div>
        )}
      </div>

      <div className="cdms-sidebar-section">
        <span className="cdms-sidebar-label">Workspace</span>
        <div className={`cdms-nav-parent-row cdms-overview-nav-row ${openModal === null ? "active" : ""}`} ref={overviewPickerRef}>
          <button
            className="cdms-nav-item cdms-nav-parent-select"
            onClick={() => {
              onOpenModal(null);
              onOverviewPickerOpenChange(false);
            }}
          >
            <span className="cdms-nav-icon"><LayoutDashboard aria-hidden="true" /></span>
            <span>Overview</span>
          </button>
          <button
            type="button"
            className="cdms-overview-nav-add"
            disabled={!selectedClient || overviewLayoutCount >= MAX_OVERVIEW_PANELS}
            onClick={() => {
              onOpenModal(null);
              onOverviewPickerOpenChange(!overviewPickerOpen);
            }}
            aria-expanded={overviewPickerOpen}
            aria-controls="overview-panel-picker"
            title={overviewLayoutCount >= MAX_OVERVIEW_PANELS ? "Overview already has six panels" : "Add an overview panel"}
            aria-label={overviewLayoutCount >= MAX_OVERVIEW_PANELS ? "Overview already has six panels" : "Add an overview panel"}
          >
            <Plus size={15} aria-hidden="true" />
          </button>
        </div>
        <NavigationItem id="reports" label="Reports" icon={<FileChartColumn aria-hidden="true" />} draggable={false} {...navigationItemProps} />
        <NavigationItem id="misc" label="Notes" icon={<NotebookPen aria-hidden="true" />} {...navigationItemProps} />
      </div>

      <div className="cdms-sidebar-section">
        <div className={`cdms-nav-parent-row ${openModal === "userDirectory" ? "active" : ""}`}>
          <NavigationItem id="userDirectory" label="Users" icon={<Users aria-hidden="true" />} parent {...navigationItemProps} />
          <button type="button" className="cdms-nav-parent-toggle" onClick={() => setUsersExpanded(value => !value)} aria-expanded={usersExpanded} aria-controls="user-navigation-items" aria-label={`${usersExpanded ? "Collapse" : "Expand"} Users categories`} title={`${usersExpanded ? "Collapse" : "Expand"} Users categories`}>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        {usersExpanded && (
          <div id="user-navigation-items" className="cdms-nav-children">
            <NavigationItem id="usersModal" label="People" icon={<Contact aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="emails" label="Email & Mailboxes" icon={<Mail aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="accountsAccess" label="Accounts & Access" icon={<KeyRound aria-hidden="true" />} {...navigationItemProps} />
          </div>
        )}
      </div>

      <div className="cdms-sidebar-section">
        <div className={`cdms-nav-parent-row ${openModal === "allDevices" ? "active" : ""}`}>
          <NavigationItem id="allDevices" label="Devices" icon={<HardDrive aria-hidden="true" />} parent {...navigationItemProps} />
          <button type="button" className="cdms-nav-parent-toggle" onClick={() => setDevicesExpanded(value => !value)} aria-expanded={devicesExpanded} aria-controls="device-navigation-items" aria-label={`${devicesExpanded ? "Collapse" : "Expand"} Devices categories`} title={`${devicesExpanded ? "Collapse" : "Expand"} Devices categories`}>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        {devicesExpanded && (
          <div id="device-navigation-items" className="cdms-nav-children">
            <NavigationItem id="workstationsRaw" label="Workstations" icon={<Monitor aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="domainAD" label="Servers & Directory" icon={<Server aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="networkDevices" label="Network Devices" icon={<EthernetIcon />} {...navigationItemProps} />
            <NavigationItem id="devices" label="Print & Scan" icon={<Printer aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="camerasModal" label="Cameras & Security" icon={<Camera aria-hidden="true" />} {...navigationItemProps} />
          </div>
        )}
      </div>

      <div className="cdms-sidebar-section">
        <div className={`cdms-nav-parent-row ${openModal === "systemsServices" ? "active" : ""}`}>
          <NavigationItem id="systemsServices" label="Services" icon={<Workflow aria-hidden="true" />} parent {...navigationItemProps} />
          <button type="button" className="cdms-nav-parent-toggle" onClick={() => setSystemsExpanded(value => !value)} aria-expanded={systemsExpanded} aria-controls="systems-navigation-items" aria-label={`${systemsExpanded ? "Collapse" : "Expand"} Services categories`} title={`${systemsExpanded ? "Collapse" : "Expand"} Services categories`}>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
        </div>
        {systemsExpanded && (
          <div id="systems-navigation-items" className="cdms-nav-children">
            <NavigationItem id="vms" label="Virtualization" icon={<Boxes aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="servicesModal" label="Apps & Providers" icon={<AppWindow aria-hidden="true" />} {...navigationItemProps} />
            <NavigationItem id="websitesModal" label="Websites & DNS" icon={<Globe aria-hidden="true" />} {...navigationItemProps} />
          </div>
        )}
      </div>
    </aside>
  );
}
