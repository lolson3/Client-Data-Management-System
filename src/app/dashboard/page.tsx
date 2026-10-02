"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { FullPageModal } from "@/components/FullPageModal";
import { CategoryPanel } from "@/components/CategoryPanel";
import { CategoryTableView } from "@/components/CategoryTableView";
import { OverviewPanel, type OverviewResizeDirection } from "@/components/OverviewPanel";
import { DataTable, type Column, SortConfig } from "@/components/DataTable";
import { CATEGORY_TABLE_DEFINITIONS, getOverviewColumns } from "@/config/categoryTableDefinitions";
import { HostGroupedView } from "@/components/HostGroupedView";
import { TitleEater, V1Celebration } from "@/components/EasterEggs";
import { AddRecordModal } from "@/components/AddRecordModal";
import { useTheme } from "@/hooks/useTheme";
import { PREFERENCE_KEYS } from "@/types/preferences";
import { overviewItemsOverlap, placeOverviewPanel, resizeOverviewLayout, type OverviewLayoutItem } from "@/lib/overviewLayout";
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
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Server,
  Settings2,
  Users,
  Workflow,
} from "lucide-react";

const CLIENT_STORAGE_KEY = "selectedClient";
const SORT_PREFS_STORAGE_KEY = "sortPreferences";
const OVERVIEW_LAYOUT_STORAGE_KEY = "cdms-overview-layout-v5";
const OVERVIEW_COLUMNS = 12;
const OVERVIEW_ROWS = 12;
const MIN_OVERVIEW_COLUMNS = 3;
const MIN_OVERVIEW_ROWS = 1;
const MAX_OVERVIEW_PANELS = 6;

interface OverviewInteraction {
  type: 'drag' | 'resize';
  panelId: string;
  targetId?: string;
  columns?: number;
  rows?: number;
}
interface WorkspaceSearchSource { section: string; modal: string; rows: any[]; }
interface WorkspaceRecordSearchResult {
  section: string;
  modal: string;
  record: string;
  matches: Array<{ field: string; value: string }>;
}

interface OverviewPanelOption {
  id: string;
  title: string;
  source: string;
  description: string;
}

const CURATED_OVERVIEW_PANELS: OverviewPanelOption[] = [
  { id: 'adminCredentials', title: 'Admin Credentials', source: 'Accounts & Access', description: 'Administrative, backup, DNS, VoIP, and remote-access credentials.' },
  { id: 'domainControllers', title: 'Domain Controllers', source: 'Servers & Directory', description: 'Servers currently providing directory services.' },
  { id: 'externalNetwork', title: 'Firewalls & Routers', source: 'Network Devices', description: 'Edge devices, routing equipment, and their network addresses.' },
  { id: 'serviceProviders', title: 'Service Providers', source: 'Apps & Providers', description: 'Provider contacts, service types, phone numbers, and accounts.' },
  { id: 'mfaAttention', title: 'MFA Attention', source: 'Email & Mailboxes', description: 'Active mailboxes that do not have MFA documented as enabled.' },
];

const CATEGORY_OVERVIEW_PANELS: OverviewPanelOption[] = [
  { id: 'userDirectory', title: 'Users', source: 'Users', description: 'People, mailboxes, and access accounts.' },
  { id: 'usersModal', title: 'People', source: 'Users', description: 'People and their contact and workstation details.' },
  { id: 'emails', title: 'Email & Mailboxes', source: 'Users', description: 'Mailbox identities, usernames, and MFA status.' },
  { id: 'accountsAccess', title: 'Accounts & Access', source: 'Users', description: 'User, shared, application, and administrative accounts.' },
  { id: 'allDevices', title: 'All Devices', source: 'Devices', description: 'The complete device inventory.' },
  { id: 'workstationsRaw', title: 'Workstations', source: 'Devices', description: 'Managed laptops and desktops.' },
  { id: 'domainAD', title: 'Servers & Directory', source: 'Devices', description: 'Servers, directory roles, and local domains.' },
  { id: 'networkDevices', title: 'Network Devices', source: 'Devices', description: 'Routers, switches, and firewalls.' },
  { id: 'devices', title: 'Print & Scan', source: 'Devices', description: 'Printers, scanners, and multifunction devices.' },
  { id: 'camerasModal', title: 'Cameras & Security', source: 'Devices', description: 'Cameras and physical-security equipment.' },
  { id: 'systemsServices', title: 'Services', source: 'Services', description: 'Virtualization, applications, providers, websites, and domains.' },
  { id: 'vms', title: 'Virtualization', source: 'Services', description: 'Virtual machines, containers, and daemons.' },
  { id: 'servicesModal', title: 'Apps & Providers', source: 'Services', description: 'Applications and external service providers.' },
  { id: 'websitesModal', title: 'Websites & DNS', source: 'Services', description: 'Public websites, hosting, and DNS records.' },
  { id: 'misc', title: 'Notes', source: 'Workspace', description: 'Client notes and operating information.' },
];

const isAffirmativeValue = (value: unknown) => (
  value === true || value === 1 || /^(1|true|yes|enabled)$/i.test(String(value || '').trim())
);

const recordNoteFields = (record: Record<string, any>) => Object.fromEntries(
  Object.entries(record).filter(([key]) => /^Notes?(?:\s+\d+)?$/i.test(key))
);

const flattenMiscNotes = (rows: Record<string, any>[]) => rows.flatMap((row, rowIndex) => (
  Object.entries(row).flatMap(([columnKey, rawValue]) => {
    const note = String(rawValue ?? '').trim();
    const isStandardNote = /^Notes?(?:\s+\d+)?$/i.test(columnKey);
    const isCriticalNote = /^Critical Notes?(?:\s+\d+)?$/i.test(columnKey);
    if (!note || (!isStandardNote && !isCriticalNote)) return [];

    return [{
      Note: note,
      ...(isCriticalNote ? { _original: { 'Critical Note': note } } : {}),
      _rowIndex: rowIndex,
      _columnKey: columnKey,
    }];
  })
));

const noteSource = (fileKey: string, row: any, identifierKeys: string[]) => ({
  fileKey,
  row,
  identifierKeys,
});

const DEFAULT_OVERVIEW_LAYOUT: OverviewLayoutItem[] = [
  { id: 'domainAD', column: 1, row: 1, columns: 6, rows: 7 },
  { id: 'workstationsRaw', column: 7, row: 1, columns: 6, rows: 7 },
  { id: 'networkDevices', column: 1, row: 8, columns: 6, rows: 5 },
  { id: 'adminCredentials', column: 7, row: 8, columns: 6, rows: 5 },
];

// Bootstrap Icons "ethernet" (MIT), kept inline to avoid another icon dependency.
function EthernetIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M14 13.5v-7a.5.5 0 0 0-.5-.5H12V4.5a.5.5 0 0 0-.5-.5h-1v-.5A.5.5 0 0 0 10 3H6a.5.5 0 0 0-.5.5V4h-1a.5.5 0 0 0-.5.5V6H2.5a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5M3.75 11h.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25m2 0h.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25m1.75.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25zM9.75 11h.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25v-1.5a.25.25 0 0 1 .25-.25m1.75.25a.25.25 0 0 1 .25-.25h.5a.25.25 0 0 1 .25.25v1.5a.25.25 0 0 1-.25.25h-.5a.25.25 0 0 1-.25-.25z" />
      <path d="M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zM1 2a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z" />
    </svg>
  );
}

// Avocado silhouette adapted from the CC0 SVG Repo avocado icon.
function AvocadoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5c-2.7 0-3.7 3-4.7 5.4C6.1 10.8 3.8 13.3 4 17c.2 3.2 2.8 5 8 5s7.8-1.8 8-5c.2-3.7-2.1-6.2-3.3-9.1-1-2.4-2-5.4-4.7-5.4Z" />
      <circle cx="12" cy="15.5" r="3.25" />
      <path d="M12 2.5c.1-1.1.9-1.8 2-2" />
    </svg>
  );
}

// Default sorts for each table (user's preference overrides these)
const DEFAULT_SORTS: Record<string, SortConfig> = {
  coreInfra: { key: 'IP address', direction: 'asc' },
  workstationsUsers: { key: 'ipAddress', direction: 'asc' },
  externalInfo: { key: 'IntIP', direction: 'asc' },
  devices: { key: 'IP address', direction: 'asc' },
  emails: { key: 'Email', direction: 'asc' },
  servicesModal: { key: 'Name', direction: 'asc' },
  usersModal: { key: 'Login', direction: 'asc' },
  domainAD: { key: 'IP address', direction: 'asc' },
  workstations: { key: 'IP Address', direction: 'asc' },
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [appVersion, setAppVersion] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState<Array<{value: string, label: string, group?: string}>>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [clientSearchDirty, setClientSearchDirty] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [contactMenuOpen, setContactMenuOpen] = useState(false);
  const [overviewPickerOpen, setOverviewPickerOpen] = useState(false);
  const [activeClientIndex, setActiveClientIndex] = useState(0);
  const [workspaceSearch, setWorkspaceSearch] = useState("");
  const [submittedWorkspaceSearch, setSubmittedWorkspaceSearch] = useState("");
  const clientPickerRef = useRef<HTMLDivElement>(null);
  const contactMenuRef = useRef<HTMLDivElement>(null);
  const overviewPickerRef = useRef<HTMLDivElement>(null);
  const overviewPickerMenuRef = useRef<HTMLDivElement>(null);
  const clientSearchInputRef = useRef<HTMLInputElement>(null);
  const overviewGridRef = useRef<HTMLDivElement>(null);
  const overviewResizeCleanupRef = useRef<(() => void) | null>(null);
  const overviewDragPanelRef = useRef('');
  const overviewDragOffsetRef = useRef({ column: 0, row: 0 });
  const overviewDragFromSidebarRef = useRef(false);
  const suppressSidebarClickUntilRef = useRef(0);
  const overviewDragRectsRef = useRef<Map<string, DOMRect>>(new Map());
  const overviewPendingRectsRef = useRef<Map<string, DOMRect> | null>(null);
  const overviewPanelAnimationsRef = useRef<Map<string, Animation>>(new Map());
  const [loading, setLoading] = useState(true);
  const [externalInfo, setExternalInfo] = useState<any[]>([]);
  const [coreInfra, setCoreInfra] = useState<any[]>([]);
  const [workstationsUsers, setWorkstationsUsers] = useState<any[]>([]);
  const [managedInfo, setManagedInfo] = useState<any[]>([]);
  const [adminCredentials, setAdminCredentials] = useState<any>({
    adminEmails: [],
    voipLogins: [],
    acronisBackups: [],
    cloudflareAdmins: []
  });
  const [loadingData, setLoadingData] = useState(false);
  const [guacamoleHosts, setGuacamoleHosts] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [vms, setVms] = useState<any[]>([]);
  const [daemons, setDaemons] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [workstations, setWorkstations] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);
  const [websites, setWebsites] = useState<any[]>([]);
  const [whoisAvailable, setWhoisAvailable] = useState(false);

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [usersExpanded, setUsersExpanded] = useState(true);
  const [devicesExpanded, setDevicesExpanded] = useState(true);
  const [systemsExpanded, setSystemsExpanded] = useState(true);
  const [overviewLayout, setOverviewLayout] = useState<OverviewLayoutItem[]>(DEFAULT_OVERVIEW_LAYOUT);
  const [overviewLayoutReady, setOverviewLayoutReady] = useState(false);
  const [overviewInteraction, setOverviewInteraction] = useState<OverviewInteraction | null>(null);
  const [maximizedOverviewPanel, setMaximizedOverviewPanel] = useState<string | null>(null);
  const [coreDeviceCategory] = useState<'all' | 'routers' | 'switches' | 'servers'>('all');
  const [externalDeviceCategory] = useState<'all' | 'firewalls'>('all');
  const [miscData, setMiscData] = useState<any[]>([]);
  const [reportsTab, setReportsTab] = useState<'inactive' | 'missingData' | 'mfaStatus' | 'firmware' | 'resources' | 'passwordAge' | 'win11'>('inactive');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(OVERVIEW_LAYOUT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as OverviewLayoutItem[];
        if (Array.isArray(parsed)) {
          const defaultPanelReplacements: Record<string, string> = {
            workstationsUsers: 'workstationsRaw',
            externalNetwork: 'networkDevices',
          };
          const legacyDefaultSlots: Record<string, Pick<OverviewLayoutItem, 'column' | 'row' | 'columns' | 'rows'>> = {
            workstationsUsers: { column: 7, row: 1, columns: 6, rows: 9 },
            externalNetwork: { column: 1, row: 10, columns: 4, rows: 3 },
          };
          const migrated = parsed.filter(item => item.id !== 'contacts').map(item => {
            const replacementId = defaultPanelReplacements[item.id];
            const legacySlot = legacyDefaultSlots[item.id];
            const occupiesLegacyDefaultSlot = legacySlot
              && !parsed.some(candidate => candidate.id === replacementId)
              && item.column === legacySlot.column
              && item.row === legacySlot.row
              && item.columns === legacySlot.columns
              && item.rows === legacySlot.rows;
            const migratedItem = occupiesLegacyDefaultSlot ? { ...item, id: replacementId } : item;
            if (migratedItem.id === 'domainAD' && migratedItem.column === 1 && migratedItem.row === 1 && migratedItem.columns === 6 && migratedItem.rows === 9) {
              return { ...migratedItem, rows: 7 };
            }
            if (migratedItem.id === 'workstationsRaw' && migratedItem.column === 7 && migratedItem.row === 1 && migratedItem.columns === 6 && migratedItem.rows === 9) {
              return { ...migratedItem, rows: 7 };
            }
            if (migratedItem.id === 'networkDevices' && migratedItem.column === 1 && migratedItem.row === 10 && [4, 6].includes(migratedItem.columns) && migratedItem.rows === 3) {
              return { ...migratedItem, row: 8, columns: 6, rows: 5 };
            }
            if (migratedItem.id === 'adminCredentials' && [7, 9].includes(migratedItem.column) && migratedItem.row === 10 && [4, 6].includes(migratedItem.columns) && migratedItem.rows === 3) {
              return { ...migratedItem, column: 7, row: 8, columns: 6, rows: 5 };
            }
            return migratedItem;
          });
          setOverviewLayout(migrated.slice(0, MAX_OVERVIEW_PANELS));
        }
      }
    } catch (error) {
      console.debug('Unable to load overview layout:', error);
    } finally {
      setOverviewLayoutReady(true);
    }
  }, []);

  useEffect(() => {
    if (!overviewLayoutReady) return;
    localStorage.setItem(OVERVIEW_LAYOUT_STORAGE_KEY, JSON.stringify(overviewLayout));
  }, [overviewLayout, overviewLayoutReady]);

  useEffect(() => () => overviewResizeCleanupRef.current?.(), []);

  const captureOverviewRects = useCallback(() => {
    const grid = overviewGridRef.current;
    if (!grid) return;
    overviewPendingRectsRef.current = new Map(
      Array.from(grid.querySelectorAll<HTMLElement>('[data-overview-panel]'))
        .map(element => [element.dataset.overviewPanel || '', element.getBoundingClientRect()] as const)
        .filter(([id]) => Boolean(id))
    );
  }, []);

  useLayoutEffect(() => {
    const previousRects = overviewPendingRectsRef.current;
    const grid = overviewGridRef.current;
    if (!previousRects || !grid) return;
    overviewPendingRectsRef.current = null;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;

    grid.querySelectorAll<HTMLElement>('[data-overview-panel]').forEach(element => {
      const panelId = element.dataset.overviewPanel || '';
      const previousRect = previousRects.get(panelId);
      const nextRect = element.getBoundingClientRect();
      overviewPanelAnimationsRef.current.get(panelId)?.cancel();

      const keyframes = previousRect
        ? [
            {
              transformOrigin: 'top left',
              transform: `translate(${previousRect.left - nextRect.left}px, ${previousRect.top - nextRect.top}px) scale(${previousRect.width / Math.max(nextRect.width, 1)}, ${previousRect.height / Math.max(nextRect.height, 1)})`,
            },
            { transformOrigin: 'top left', transform: 'translate(0, 0) scale(1, 1)' },
          ]
        : [
            { opacity: 0, transform: 'scale(.985)' },
            { opacity: 1, transform: 'scale(1)' },
          ];
      const animation = element.animate(keyframes, { duration: 150, easing: 'cubic-bezier(.2,.8,.2,1)' });
      overviewPanelAnimationsRef.current.set(panelId, animation);
      animation.onfinish = () => overviewPanelAnimationsRef.current.delete(panelId);
    });
  }, [maximizedOverviewPanel, overviewLayout]);

  // Add record modal state
  const [addModalType, setAddModalType] = useState<string | null>(null);
  const [companyModalMode, setCompanyModalMode] = useState<'add' | 'selectForUpdate' | 'update' | null>(null);
  const [companyEditTarget, setCompanyEditTarget] = useState<string | null>(null);
  const [companyEditData, setCompanyEditData] = useState<Record<string, any> | null>(null);

  // Sort preferences state (user's saved sort preferences per table)
  const [sortPreferences, setSortPreferences] = useState<Record<string, SortConfig>>({});

  // Get sort config for a table (user preference > default)
  const getSortConfig = useCallback((tableId: string): SortConfig | undefined => {
    return sortPreferences[tableId] || DEFAULT_SORTS[tableId];
  }, [sortPreferences]);

  // Handle sort change - save to localStorage and server
  const handleSortChange = useCallback(async (tableId: string, sortConfig: SortConfig | null) => {
    const newPrefs = { ...sortPreferences };
    if (sortConfig) {
      newPrefs[tableId] = sortConfig;
    } else {
      delete newPrefs[tableId];
    }
    setSortPreferences(newPrefs);

    // Save to localStorage
    localStorage.setItem(SORT_PREFS_STORAGE_KEY, JSON.stringify(newPrefs));

    // Save to server if authenticated
    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch("/api/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: SORT_PREFS_STORAGE_KEY,
            value: JSON.stringify(newPrefs),
          }),
        });
      } catch (error) {
        console.debug("Failed to save sort preferences to server:", error);
      }
    }
  }, [sortPreferences]);

  const visibleCoreInfra = useMemo(() => {
    if (coreDeviceCategory === 'all') return coreInfra;

    const category = coreDeviceCategory === 'switches' ? 'switch' : coreDeviceCategory.slice(0, -1);
    return coreInfra.filter(device =>
      [device['Device Type'], device.Grouping]
        .some(value => String(value || '').toLowerCase().includes(category))
    );
  }, [coreDeviceCategory, coreInfra]);
  const visibleExternalInfo = useMemo(() => {
    if (externalDeviceCategory === 'all') return externalInfo;

    return externalInfo.filter(device =>
      [device['Device Type'], device.Grouping]
        .some(value => String(value || '').toLowerCase().includes('firewall'))
    );
  }, [externalDeviceCategory, externalInfo]);
  const networkDevices = useMemo(() => [
    ...coreInfra
      .filter(device => /router|switch/i.test(String(device['Device Type'] || '')))
      .map(device => ({
        ...device,
        _source: 'core',
        _original: device,
        _noteSource: noteSource('core', device, ['Client', 'Name', 'IP address']),
        Location: device.SubName,
        'Internal IP': device['IP address'],
        'External IP': '',
        Username: device.Login,
      })),
    ...externalInfo
      .filter(device => /router|firewall/i.test(String(device['Device Type'] || '')))
      .map(device => ({
        ...device,
        _source: 'externalInfo',
        _original: device,
        _noteSource: noteSource('externalInfo', device, ['Client', 'SubName', 'Device Type']),
        Name: device.Name || device['Device Type'],
        Location: device.SubName,
        'Internal IP': device.IntIP,
        'External IP': device['IP address'],
        Description: device.Description || device.Notes,
      })),
  ], [coreInfra, externalInfo]);
  const serverDevices = useMemo(
    () => coreInfra.filter((item: any) =>
      /server/i.test(String(item['Device Type'] || '')) ||
      item['AD Server'] === 1 ||
      item['AD Server'] === '1' ||
      item['AD Server'] === true
    ),
    [coreInfra]
  );
  const typedDomains = useMemo(() => domains.map(domain => {
    const domainName = String(domain['Domain Name'] || '');
    const explicitType = String(domain['Domain Type'] || '').trim();
    return {
      ...domain,
      'Domain Type': explicitType || (domainName.includes('.') ? 'Web' : 'Local Network'),
    };
  }), [domains]);
  const localDomain = useMemo(
    () => typedDomains.find(domain => /local|directory|active directory|network/i.test(String(domain['Domain Type']))),
    [typedDomains]
  );
  const webDomains = useMemo(
    () => typedDomains.filter(domain => /web|public/i.test(String(domain['Domain Type']))),
    [typedDomains]
  );
  const applicationsProviders = useMemo(() => [
    ...services.map(item => ({
      ...recordNoteFields(item),
      'Record Type': 'Application',
      Name: item.Service,
      Contact: '',
      Email: '',
      Phone: '',
      Account: item.Username,
      Password: item.Password,
      'Host / URL': item['Host / URL'],
      'Service Type': 'Application',
      Notes: item.Notes,
      _noteSource: noteSource('services', item, ['Client', 'Service']),
    })),
    ...managedInfo.map(item => ({
      ...recordNoteFields(item),
      'Record Type': 'Provider',
      Name: item.Provider,
      Contact: item.Name,
      Email: item.Email,
      Phone: [item['Phone 1'], item['Phone 2'], item['Phone 3'], item['Phone 4']].filter(Boolean).join(' / '),
      Account: item['Account #'],
      Password: '',
      'Host / URL': [item['IP 1'], item['IP 2']].filter(Boolean).join(' / '),
      'Service Type': item.Type,
      _noteSource: noteSource('managedInfo', item, ['Client', 'Provider', 'Name']),
    })),
  ], [managedInfo, services]);
  const systemsServices = useMemo(() => [
    ...vms.map(item => ({
      ...recordNoteFields(item),
      Category: 'Virtualization',
      'Record Type': 'Virtual Machine',
      Name: item.Name,
      Host: item.Host || item.Location,
      Address: item.IP,
      Account: item['Assigned To'],
      Notes: item.Notes,
      _noteSource: noteSource('vms', item, ['Client', 'Name', 'Host']),
    })),
    ...containers.map(item => ({
      ...recordNoteFields(item),
      Category: 'Virtualization',
      'Record Type': 'Container',
      Name: item.Name,
      Host: item.Host || item.Location,
      Address: [item.IP, item.Port].filter(Boolean).join(':'),
      Account: '',
      Notes: item['Startup Notes'] || item.Notes,
      _noteSource: noteSource('containers', item, ['Client', 'Name', 'Host']),
    })),
    ...daemons.map(item => ({
      ...recordNoteFields(item),
      Category: 'Virtualization',
      'Record Type': 'Daemon',
      Name: item.Name,
      Host: item.Host || item.Location,
      Address: item.IP,
      Account: item.User,
      Notes: item.Notes,
      _noteSource: noteSource('daemons', item, ['Client', 'Name', 'Host']),
    })),
    ...applicationsProviders.map(item => ({
      ...recordNoteFields(item),
      Category: 'Apps & Providers',
      'Record Type': item['Record Type'],
      Name: item.Name,
      Host: item['Host / URL'],
      Address: item.Email || item.Phone || item['Host / URL'],
      Account: item.Account,
      _noteSource: item._noteSource,
    })),
    ...websites.map(item => ({
      ...recordNoteFields(item),
      Category: 'Websites & DNS',
      'Record Type': 'Website / DNS',
      Name: item.URL || item['Website Host'] || item['DNS Host'],
      Host: item['Website Host'] || item['DNS Host'],
      Address: item.URL,
      Account: item['Website Username'] || item['DNS Username'],
      Notes: item.Notes,
      _noteSource: noteSource('websites', item, ['Client', 'DNS Host', 'URL']),
    })),
    ...typedDomains.map(item => ({
      ...recordNoteFields(item),
      Category: 'Websites & DNS',
      'Record Type': item['Domain Type'] || 'Domain',
      Name: item['Domain Name'],
      Host: item['Alt Domain'],
      Address: '',
      Account: item['Admin Login'],
      Notes: item.Notes,
      _noteSource: noteSource('domains', item, ['Client', 'Domain Name']),
    })),
  ], [applicationsProviders, containers, daemons, typedDomains, vms, websites]);
  const hasDirectoryServer = serverDevices.some(server =>
    server['AD Server'] === 1 || server['AD Server'] === '1' || server['AD Server'] === true
  );
  const localDomainName = String(localDomain?.['Domain Name'] || (hasDirectoryServer ? selectedClient.toUpperCase() : ''));
  const directoryAdminLogin = String(localDomain?.['Admin Login'] || (localDomainName ? `${localDomainName}/Administrator` : ''));
  const serverDirectoryRows = useMemo(() => serverDevices.map(server => {
    const isDirectoryServer = server['AD Server'] === 1 || server['AD Server'] === '1' || server['AD Server'] === true;
    const rawLogin = String(server.Login || '');
    const normalizedLogin = rawLogin.replace(/\\/g, '/');
    const qualifiedLogin = isDirectoryServer && localDomainName && normalizedLogin && !normalizedLogin.includes('/')
      ? `${localDomainName}/${normalizedLogin}`
      : normalizedLogin;

    return {
      ...server,
      'Directory Role': isDirectoryServer ? 'Domain Controller' : 'Member Server',
      'Local Domain': isDirectoryServer ? localDomainName : '',
      Login: isDirectoryServer ? (directoryAdminLogin || qualifiedLogin) : normalizedLogin,
    };
  }), [directoryAdminLogin, localDomainName, serverDevices]);
  const userDirectory = useMemo(() => users.map(user => {
    const emailAccount = emails.find(email =>
      (user.Login && email.Username === user.Login) ||
      (user.Name && email.Name === user.Name)
    );
    return {
      ...user,
      Email: emailAccount?.Email || '',
      'Email MFA': emailAccount?.['MFA or Ignore'],
    };
  }), [emails, users]);
  const peopleContacts = useMemo(
    () => userDirectory.filter(person => person.Phone || person.Email),
    [userDirectory]
  );
  const providerContacts = useMemo(
    () => applicationsProviders.filter(record => record['Record Type'] === 'Provider' && (record.Phone || record.Email)),
    [applicationsProviders]
  );
  const accessAccounts = useMemo(() => [
    ...users.filter(user => user.Login).map(user => ({
      ...recordNoteFields(user),
      'Account Type': 'Windows / Domain', Owner: user.Name, 'Owner Type': 'Person', Account: user.Login,
      Password: user.Password, Resource: user['Computer Name'] || localDomainName, URL: '', Notes: user.Notes,
      _noteSource: noteSource('users', user, ['Client', 'Login']),
    })),
    ...services.filter(service => service.Username).map(service => ({
      ...recordNoteFields(service),
      'Account Type': 'Application', Owner: 'Client-wide', 'Owner Type': 'Shared', Account: service.Username,
      Password: service.Password, Resource: service.Service, URL: service['Host / URL'], Notes: service.Notes,
      _noteSource: noteSource('services', service, ['Client', 'Service']),
    })),
    ...adminCredentials.adminEmails.map((account: any) => ({
      ...recordNoteFields(account),
      'Account Type': 'Administrative Email', Owner: account.Name || 'Client-wide', 'Owner Type': 'Administrative', Account: account.Email,
      Password: account.Password, Resource: 'Email administration', URL: '', Notes: account.Notes,
      _noteSource: noteSource('adminEmails', account, ['Client', 'Email']),
    })),
    ...adminCredentials.voipLogins.map((account: any) => ({
      ...recordNoteFields(account),
      'Account Type': 'VoIP Administration', Owner: 'Client-wide', 'Owner Type': 'Shared', Account: account.Login,
      Password: account.Password, Resource: account.Provider, URL: '', Notes: account.Notes,
      _noteSource: noteSource('adminVoipLogins', account, ['Client', 'Provider', 'Login']),
    })),
    ...adminCredentials.acronisBackups.map((account: any) => ({
      ...recordNoteFields(account),
      'Account Type': 'Backup Administration', Owner: 'Client-wide', 'Owner Type': 'Administrative', Account: account.UserName,
      Password: account.PW, Resource: 'Acronis', URL: account['Acronis Cyber Cloud '], Notes: '',
      _noteSource: noteSource('acronisBackups', account, ['Client', 'UserName']),
    })),
    ...adminCredentials.cloudflareAdmins.map((account: any) => ({
      ...recordNoteFields(account),
      'Account Type': 'DNS Administration', Owner: 'Client-wide', 'Owner Type': 'Administrative', Account: account.username,
      Password: account.pass, Resource: 'Cloudflare', URL: '', Notes: '',
      _noteSource: noteSource('cloudflareAdmins', account, ['Client', 'username']),
    })),
    ...guacamoleHosts.filter(account => account['Admin username']).map(account => ({
      ...recordNoteFields(account),
      'Account Type': 'Remote Access', Owner: 'Client-wide', 'Owner Type': 'Administrative', Account: account['Admin username'],
      Password: account.Password, Resource: account['Cloud Name'], URL: account.IP, Notes: account.Notes,
      _noteSource: noteSource('guacamoleHosts', account, ['Client', 'Cloud Name']),
    })),
  ], [adminCredentials, guacamoleHosts, localDomainName, services, users]);
  const allUserRecords = useMemo(() => [
    ...userDirectory.map(user => ({
      ...recordNoteFields(user),
      Category: 'People',
      'Record Type': 'Person',
      Name: user.Name,
      Account: user.Login,
      Email: user.Email,
      Phone: [user.Phone, user.Cell].filter(Boolean).join(' / '),
      Resource: user['Computer Name'],
      Password: user.Password,
      Status: user.Active === 0 || user.Active === '0' || user.Active === false ? 'Inactive' : 'Active',
      Notes: user.Notes,
      _noteSource: noteSource('users', user, ['Client', 'Login']),
    })),
    ...emails.map(email => ({
      ...recordNoteFields(email),
      Category: 'Email & Mailboxes',
      'Record Type': 'Mailbox',
      Name: email.Name,
      Account: email.Username,
      Email: email.Email,
      Phone: '',
      Resource: '',
      Password: email.Password,
      Status: email.Active === 0 || email.Active === '0' || email.Active === false ? 'Inactive' : 'Active',
      Notes: email.Notes,
      _noteSource: noteSource('emails', email, ['Client', 'Email']),
    })),
    ...accessAccounts.map(account => ({
      ...recordNoteFields(account),
      Category: 'Accounts & Access',
      'Record Type': account['Account Type'],
      Name: account.Owner,
      Account: account.Account,
      Email: '',
      Phone: '',
      Resource: account.Resource || account.URL,
      Password: account.Password,
      Status: '',
      Notes: account.Notes,
      _noteSource: account._noteSource,
    })),
  ], [accessAccounts, emails, userDirectory]);
  const allDevices = useMemo(() => [
    ...workstations.map(device => ({
      ...recordNoteFields(device),
      Category: 'Workstations',
      'Device Type': device['Device Type'] || 'Workstation',
      Name: device['Computer Name'],
      Location: device.SubName,
      'Internal IP': device['IP Address'],
      'External IP': '',
      'Service Tag': device['Service Tag'],
      Description: device.Description,
      Grouping: device.Grouping,
      'Asset ID': device['Asset ID'],
      _noteSource: noteSource('workstations', device, ['Client', 'Computer Name']),
    })),
    ...coreInfra.map(device => ({
      ...recordNoteFields(device),
      Category: /server/i.test(String(device['Device Type'] || '')) ? 'Servers & Directory' : 'Network Devices',
      'Device Type': device['Device Type'],
      Name: device.Name,
      Location: device.SubName,
      'Internal IP': device['IP address'],
      'External IP': '',
      'Service Tag': device['Service Tag'],
      Description: device.Description,
      Grouping: device.Grouping,
      'Asset ID': device['Asset ID'],
      _noteSource: noteSource('core', device, ['Client', 'Name', 'IP address']),
    })),
    ...externalInfo
      .filter(device => /router|firewall/i.test(String(device['Device Type'] || '')))
      .map(device => ({
        ...recordNoteFields(device),
        Category: 'Network Devices',
        'Device Type': device['Device Type'],
        Name: device.Name || device['Device Type'],
        Location: device.SubName,
        'Internal IP': device.IntIP,
        'External IP': device['IP address'],
        'Service Tag': device['Service Tag'],
        Description: device.Description || device.Notes,
        Grouping: device.Grouping,
        'Asset ID': device['Asset ID'],
        _noteSource: noteSource('externalInfo', device, ['Client', 'SubName', 'Device Type']),
      })),
    ...devices.map(device => ({
      ...recordNoteFields(device),
      Category: 'Print & Scan',
      'Device Type': device['Device Type'],
      Name: device.Name,
      Location: device.SubName,
      'Internal IP': device['IP address'],
      'External IP': '',
      'Service Tag': device['Service Tag'],
      Description: device.Note,
      Grouping: device.Grouping,
      'Asset ID': device['Asset ID'],
      _noteSource: noteSource('devices', device, ['client', 'Name']),
    })),
    ...cameras.map(device => ({
      ...recordNoteFields(device),
      Category: 'Cameras & Security',
      'Device Type': device['Device Type'] || 'Camera',
      Name: device.Name,
      Location: device.Location || device.SubName,
      'Internal IP': device.IP,
      'External IP': '',
      'Service Tag': device['Service Tag'],
      Description: [device.Vendor, device.Model].filter(Boolean).join(' '),
      Grouping: device.Grouping,
      'Asset ID': device['Asset ID'],
      _noteSource: noteSource('cameras', device, ['Client', 'Name']),
    })),
  ], [cameras, coreInfra, devices, externalInfo, workstations]);

  const filteredClients = useMemo(() => {
    const query = clientSearchDirty ? clientSearch.trim().toLowerCase() : '';
    if (!query) return clients;

    return clients
      .filter(client =>
        client.label.toLowerCase().includes(query) ||
        client.value.toLowerCase().includes(query) ||
        client.group?.toLowerCase().includes(query)
      )
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(query) || a.value.toLowerCase().startsWith(query);
        const bStarts = b.label.toLowerCase().startsWith(query) || b.value.toLowerCase().startsWith(query);
        return Number(bStarts) - Number(aStarts) || a.label.localeCompare(b.label);
      });
  }, [clientSearch, clientSearchDirty, clients]);

  const selectedClientRecord = useMemo(
    () => clients.find(client => client.value === selectedClient),
    [clients, selectedClient]
  );
  const guacamoleUrl = useMemo(
    () => String(guacamoleHosts.find(host => host?.['Cloud Name'])?.['Cloud Name'] || '').trim(),
    [guacamoleHosts]
  );

  const workspaceSearchSources = useMemo<WorkspaceSearchSource[]>(() => [
      { section: 'Users', modal: 'userDirectory', rows: allUserRecords },
      { section: 'People', modal: 'usersModal', rows: userDirectory },
      { section: 'Email & Mailboxes', modal: 'emails', rows: emails },
      { section: 'Accounts & Access', modal: 'accountsAccess', rows: accessAccounts },
      { section: 'Workstations', modal: 'workstationsRaw', rows: workstations },
      { section: 'Servers & Directory', modal: 'domainAD', rows: [...serverDirectoryRows, ...typedDomains] },
      { section: 'Network Devices', modal: 'networkDevices', rows: networkDevices },
      { section: 'Print & Scan', modal: 'devices', rows: devices },
      { section: 'Cameras & Security', modal: 'camerasModal', rows: cameras },
      { section: 'Services', modal: 'systemsServices', rows: systemsServices },
      { section: 'Apps & Providers', modal: 'servicesModal', rows: applicationsProviders },
      { section: 'Websites & DNS', modal: 'websitesModal', rows: websites },
      { section: 'Virtual Infrastructure', modal: 'vms', rows: [...vms, ...containers, ...daemons] },
      { section: 'Remote Access', modal: 'accountsAccess', rows: guacamoleHosts },
      { section: 'Notes', modal: 'misc', rows: miscData },
  ], [accessAccounts, allUserRecords, applicationsProviders, cameras, containers, daemons, devices, emails, guacamoleHosts, miscData, networkDevices, serverDirectoryRows, systemsServices, typedDomains, userDirectory, vms, websites, workstations]);

  const workspaceSearchResults = useMemo(() => {
    const query = workspaceSearch.trim().toLowerCase();
    if (!query || !selectedClient) return [];

    const sensitiveField = /password|\bpw\b|secret|token|credential/i;
    const results: Array<{ section: string; modal: string; field: string; value: string; record: string }> = [];

    for (const source of workspaceSearchSources) {
      if (source.section.toLowerCase().includes(query)) {
        results.push({ section: source.section, modal: source.modal, field: 'Category', value: source.section, record: `${source.rows.length} records` });
      }

      for (const row of source.rows) {
        const entries = Object.entries(row || {}).filter(([key, value]) =>
          !key.startsWith('_') && value !== null && value !== undefined && value !== ''
        );
        const record = entries.find(([key]) => /name|email|login|username|service|domain|host|computer/i.test(key));
        const recordLabel = record ? String(record[1]) : source.section;

        for (const [field, rawValue] of entries) {
          const isSensitive = sensitiveField.test(field);
          const value = isSensitive ? '' : String(rawValue);
          if (field.toLowerCase().includes(query) || value.toLowerCase().includes(query)) {
            results.push({
              section: source.section,
              modal: source.modal,
              field,
              value: isSensitive ? 'Stored securely' : value,
              record: recordLabel,
            });
          }
          if (results.length >= 40) return results;
        }
      }
    }

    return results;
  }, [selectedClient, workspaceSearch, workspaceSearchSources]);

  const submittedWorkspaceSearchResults = useMemo<WorkspaceRecordSearchResult[]>(() => {
    const query = submittedWorkspaceSearch.trim().toLowerCase();
    if (!query || !selectedClient) return [];

    const sensitiveField = /password|\bpw\b|secret|token|credential/i;
    const results: WorkspaceRecordSearchResult[] = [];

    for (const source of workspaceSearchSources) {
      const categoryMatches = source.section.toLowerCase().includes(query);
      for (const row of source.rows) {
        const entries = Object.entries(row || {}).filter(([key, value]) =>
          !key.startsWith('_') && value !== null && value !== undefined && value !== ''
        );
        const identity = entries.find(([key]) => /name|email|login|username|service|domain|host|computer/i.test(key));
        const fieldMatches = entries.flatMap(([field, rawValue]) => {
          const isSensitive = sensitiveField.test(field);
          const value = isSensitive ? '' : String(rawValue);
          if (!field.toLowerCase().includes(query) && !value.toLowerCase().includes(query)) return [];
          return [{ field, value: isSensitive ? 'Stored securely' : value }];
        });
        const matches = categoryMatches
          ? [{ field: 'Category', value: source.section }, ...fieldMatches]
          : fieldMatches;

        if (matches.length > 0) {
          results.push({
            section: source.section,
            modal: source.modal,
            record: identity ? String(identity[1]) : source.section,
            matches,
          });
        }
      }
    }

    return results;
  }, [selectedClient, submittedWorkspaceSearch, workspaceSearchSources]);

  // Extract data fetching into reusable function - must be defined before handlers that use it
  const fetchClientData = useCallback(() => {
    if (!selectedClient) return;

    setLoadingData(true);

    // Add cache-busting timestamp to prevent stale data after edits
    const cacheBuster = `&_t=${Date.now()}`;

    // Fetch all data in parallel (no-store prevents caching)
    Promise.all([
      fetch(`/api/data/external-info?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/core?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/workstations-users?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/managed-info?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/admin-credentials?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/guacamole?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/devices?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/containers?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/vms?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/daemons?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/services?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/domains?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/cameras?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/emails?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/users?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/workstations?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/misc/${selectedClient}?${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/phone-numbers?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json()),
      fetch(`/api/data/websites?client=${selectedClient}${cacheBuster}`, { cache: 'no-store' }).then(res => res.json())
    ])
      .then(([externalData, coreData, wsUsersData, managedData, adminData, guacData, devicesData, containersData, vmsData, daemonsData, servicesData, domainsData, camerasData, emailsData, usersData, workstationsData, miscResult, phoneData, websitesData]) => {
        setExternalInfo(externalData.data || []);
        setCoreInfra(coreData.data || []);
        setWorkstationsUsers(wsUsersData.data || []);
        setManagedInfo(managedData.data || []);
        setAdminCredentials({
          adminEmails: adminData.adminEmails || [],
          voipLogins: adminData.voipLogins || [],
          acronisBackups: adminData.acronisBackups || [],
          cloudflareAdmins: adminData.cloudflareAdmins || []
        });
        setGuacamoleHosts(guacData.data || []);
        setDevices(devicesData.data || []);
        setContainers(containersData.data || []);
        setVms(vmsData.data || []);
        setDaemons(daemonsData.data || []);
        setServices(servicesData.data || []);
        setDomains(domainsData.data || []);
        setCameras(camerasData.data || []);
        setEmails(emailsData.data || []);
        setUsers(usersData.data || []);
        setWorkstations(workstationsData.data || []);
        setMiscData(flattenMiscNotes(miscResult.data || []));
        setPhoneNumbers(phoneData.data || []);
        setWebsites(websitesData.data || []);
        setLoadingData(false);
      })
      .catch(err => {
        console.error("Failed to load data:", err);
        setExternalInfo([]);
        setCoreInfra([]);
        setWorkstationsUsers([]);
        setManagedInfo([]);
        setAdminCredentials({
          adminEmails: [],
          voipLogins: [],
          acronisBackups: [],
          cloudflareAdmins: []
        });
        setGuacamoleHosts([]);
        setDevices([]);
        setContainers([]);
        setVms([]);
        setDaemons([]);
        setServices([]);
        setDomains([]);
        setCameras([]);
        setEmails([]);
        setUsers([]);
        setWorkstations([]);
        setMiscData([]);
        setPhoneNumbers([]);
        setWebsites([]);
        setLoadingData(false);
      });
  }, [selectedClient]);

  // Handle inline cell edit - save to Excel via API
  const handleCellEdit = useCallback(async (
    fileKey: string,
    row: any,
    columnKey: string,
    newValue: any,
    identifierKeys: string[]
  ): Promise<boolean> => {
    const rowIdentifier: Record<string, any> = {};
    for (const key of identifierKeys) {
      if (row[key] !== undefined) {
        rowIdentifier[key] = row[key];
      }
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  const handleDerivedNoteChange = useCallback(async (
    row: any,
    columnKey: string,
    value: string
  ): Promise<boolean> => {
    const source = row?._noteSource;
    if (!source?.fileKey || !source?.row || !Array.isArray(source.identifierKeys)) {
      alert('This record does not have an editable source.');
      return false;
    }
    return handleCellEdit(source.fileKey, source.row, columnKey, value, source.identifierKeys);
  }, [handleCellEdit]);

  const handleDerivedActiveChange = useCallback(async (
    row: any,
    active: boolean
  ): Promise<boolean> => {
    const source = row?._noteSource;
    if (!source?.fileKey || !source?.row || !Array.isArray(source.identifierKeys)) {
      alert('This record does not have an editable source.');
      return false;
    }
    return handleCellEdit(source.fileKey, source.row, 'Active', active ? 1 : 0, source.identifierKeys);
  }, [handleCellEdit]);

  // Handle workstationsUsers cell edit - routes to correct Excel file based on field
  const handleWorkstationsUsersEdit = useCallback(async (
    row: any,
    columnKey: string,
    newValue: any
  ): Promise<boolean> => {
    const workstationFields: Record<string, string> = {
      'computerName': 'Computer Name',
      'ipAddress': 'IP Address',
      'cpu': 'CPU',
      'serviceTag': 'Service Tag',
      'description': 'Description',
      'win11Capable': 'Win11 Capable',
    };

    const userFields: Record<string, string> = {
      'username': 'Login',
      'fullName': 'Name',
      'phone': 'Phone',
      'location': 'SubName',
    };

    let fileKey: string;
    let excelColumnKey: string;
    let rowIdentifier: Record<string, any>;

    if (workstationFields[columnKey]) {
      fileKey = 'workstations';
      excelColumnKey = workstationFields[columnKey];
      rowIdentifier = {
        'Client': row._wsClient,
        'Computer Name': row._wsComputerName,
      };
    } else if (userFields[columnKey]) {
      fileKey = 'users';
      excelColumnKey = userFields[columnKey];
      rowIdentifier = {
        'Client': row._userClient,
        'Login': row._userLogin,
      };

      if (!row._userLogin) {
        alert('Cannot edit user fields - no user is assigned to this workstation.');
        return false;
      }
    } else {
      console.warn(`Unknown column key for workstationsUsers: ${columnKey}`);
      return false;
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey: excelColumnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle externalInfo cell edit - routes IntIP to Core file
  const handleExternalInfoEdit = useCallback(async (
    row: any,
    columnKey: string,
    newValue: any
  ): Promise<boolean> => {
    let fileKey: string;
    let excelColumnKey: string;
    let rowIdentifier: Record<string, any>;

    if (columnKey === 'IntIP') {
      if (!row._coreName) {
        alert('Cannot edit Internal IP - no matching core infrastructure item found.');
        return false;
      }
      fileKey = 'core';
      excelColumnKey = 'IP address';
      rowIdentifier = {
        'Client': row._coreClient,
        'Name': row._coreName,
      };
    } else {
      fileKey = 'externalInfo';
      excelColumnKey = columnKey;
      rowIdentifier = {
        'Client': row.Client,
        'SubName': row.SubName,
        'Device Type': row['Device Type'],
      };
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          fileKey,
          rowIdentifier,
          columnKey: excelColumnKey,
          newValue,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle adding a new record
  const handleAddRecord = useCallback(async (
    fileKey: string,
    rowData: Record<string, any>
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addRow',
          fileKey,
          rowData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        throw new Error(result.error || 'Failed to add record');
      }
    } catch (error: any) {
      console.error('Failed to add record:', error);
      throw error;
    }
  }, [fetchClientData]);

  const refreshClients = useCallback(async () => {
    try {
      const clientsRes = await fetch('/api/data/clients');
      const clientsData = await clientsRes.json();
      setClients(clientsData.clients || []);
    } catch (error) {
      console.error('Failed to reload clients:', error);
    }
  }, []);

  const handleSelectCompanyForUpdate = useCallback(async (
    data: Record<string, any>
  ): Promise<boolean> => {
    const client = clients.find(c => c.label === data.companyLabel);
    if (!client) {
      throw new Error('Company not found');
    }

    const [companyResponse, phoneResponse] = await Promise.all([
      fetch(`/api/data/companies?abbrv=${encodeURIComponent(client.value)}`),
      fetch(`/api/data/phone-numbers?client=${encodeURIComponent(client.value)}`, { cache: 'no-store' }),
    ]);
    const [companyResult, phoneResult] = await Promise.all([
      companyResponse.json(),
      phoneResponse.json(),
    ]);

    if (!companyResponse.ok || !companyResult.company) {
      throw new Error(companyResult.error || 'Failed to load company details');
    }

    if (!phoneResponse.ok) {
      throw new Error(phoneResult.error || 'Failed to load company phone numbers');
    }

    const companyPhoneNumbers = phoneResult.data || [];
    setCompanyEditTarget(client.value);
    setCompanyEditData({
      ...companyResult.company,
      'Main Phones': companyPhoneNumbers.map((phone: Record<string, any>) => ({
        Name: phone.Name || '',
        Number: phone.Number || '',
        Other: phone.Other || '',
        _originalName: phone.Name || '',
      })),
      _phoneNumbers: companyPhoneNumbers,
    });
    setCompanyModalMode('update');
    return true;
  }, [clients]);

  const handleCompanySave = useCallback(async (
    mode: 'add' | 'update',
    data: Record<string, any>
  ): Promise<boolean> => {
    try {
      const {
        'Main Phones': mainPhones = [],
        ...companyData
      } = data;
      const response = await fetch('/api/data/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          rowData: companyData,
          rowIdentifier: mode === 'update' ? { Abbrv: companyEditTarget } : undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save company');
      }

      const clientAbbreviation = mode === 'update' ? companyEditTarget : String(companyData.Abbrv || '').trim();
      if (!clientAbbreviation) {
        throw new Error('A client abbreviation is required to save phone numbers');
      }

      const existingPhoneNumbers: Record<string, any>[] = mode === 'update'
        ? companyEditData?._phoneNumbers || []
        : [];
      const normalizedPhones = (Array.isArray(mainPhones) ? mainPhones : [])
        .map((phone: Record<string, any>, index: number) => ({
          Name: String(phone.Name || (index === 0 && phone.Number ? 'Main Office' : '')).trim(),
          Number: String(phone.Number || '').trim(),
          Other: String(phone.Other || ''),
          _originalName: String(phone._originalName || '').trim(),
        }))
        .filter((phone: Record<string, any>) => phone.Name && phone.Number);

      const savePhoneChange = async (payload: Record<string, any>, fallbackError: string) => {
        const phoneResponse = await fetch('/api/data/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileKey: 'phoneNumbers', ...payload }),
        });
        const phoneResult = await phoneResponse.json();
        if (!phoneResponse.ok || !phoneResult.success) {
          throw new Error(phoneResult.error || fallbackError);
        }
      };

      // Delete removed or renamed lines first so name changes cannot collide with existing identifiers.
      for (const existingPhone of existingPhoneNumbers) {
        const unchangedLine = normalizedPhones.some((phone: Record<string, any>) =>
          phone._originalName === existingPhone.Name && phone.Name === existingPhone.Name
        );
        if (!unchangedLine) {
          await savePhoneChange({
            action: 'deleteRow',
            rowIdentifier: { Client: clientAbbreviation, Name: existingPhone.Name },
          }, `Failed to remove ${existingPhone.Name} phone number`);
        }
      }

      for (const phone of normalizedPhones) {
        const isUnchangedName = phone._originalName && phone._originalName === phone.Name;
        await savePhoneChange(isUnchangedName ? {
          action: 'updateRow',
          rowIdentifier: { Client: clientAbbreviation, Name: phone._originalName },
          updates: { Name: phone.Name, Number: phone.Number, Other: phone.Other },
        } : {
          action: 'addRow',
          rowData: { Client: clientAbbreviation, Name: phone.Name, Number: phone.Number, Other: phone.Other },
        }, `Failed to save ${phone.Name} phone number`);
      }

      await refreshClients();

      if (mode === 'update' && companyEditTarget) {
        setSelectedClient(companyEditTarget);
        if (selectedClient === companyEditTarget) fetchClientData();
      }

      return true;
    } catch (error: any) {
      console.error('Failed to save company:', error);
      throw error;
    }
  }, [companyEditData, companyEditTarget, fetchClientData, refreshClients, selectedClient]);

  // Handle whois autopopulate for websites modal
  const handleWhoisLookup = useCallback(async (): Promise<Record<string, any> | null> => {
    const domain = window.prompt("Enter domain name to look up (e.g., example.com):");
    if (!domain) return null;

    const cleanDomain = domain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleanDomain) return null;

    const res = await fetch(`/api/whois?action=lookup&domain=${encodeURIComponent(cleanDomain)}`);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Whois lookup failed");
    }

    const data = await res.json();
    const result: Record<string, any> = {};
    if (data.registrar) result["Registrar"] = data.registrar;
    if (data.dnsHost) result["DNS Host"] = data.dnsHost;
    if (data.websiteHost) result["Website Host"] = data.websiteHost;
    result["URL"] = cleanDomain;

    return result;
  }, []);

  // Handle marking a record as inactive (archive)
  const handleInactivate = useCallback(async (
    fileKey: string,
    row: any,
    identifierKeys: string[],
    inactiveColumn?: string
  ): Promise<boolean> => {
    const rowIdentifier: Record<string, any> = {};
    for (const key of identifierKeys) {
      if (row[key] !== undefined) {
        rowIdentifier[key] = row[key];
      }
    }

    try {
      const response = await fetch('/api/data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setInactive',
          fileKey,
          rowIdentifier,
          inactive: 1,
          ...(inactiveColumn && { inactiveColumn }),
        }),
      });

      const result = await response.json();

      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to archive: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to archive record:', error);
      alert('Failed to archive. Please try again.');
      return false;
    }
  }, [fetchClientData]);

  // Handle misc cell edit - uses per-client misc endpoint
  const handleMiscCellEdit = useCallback(async (
    row: any,
    columnKey: string,
    newValue: any
  ): Promise<boolean> => {
    if (!selectedClient) return false;
    try {
      const response = await fetch(`/api/data/misc/${selectedClient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCell',
          rowIndex: row._rowIndex,
          columnKey: row._columnKey || columnKey,
          newValue,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to save: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to save misc edit:', error);
      alert('Failed to save changes. Please try again.');
      return false;
    }
  }, [selectedClient, fetchClientData]);

  const handleMiscAddRow = useCallback(async (
    rowData: Record<string, any>
  ): Promise<boolean> => {
    if (!selectedClient) return false;
    try {
      const response = await fetch(`/api/data/misc/${selectedClient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addRow',
          rowData,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchClientData();
        return true;
      } else {
        throw new Error(result.error || 'Failed to add record');
      }
    } catch (error: any) {
      console.error('Failed to add misc record:', error);
      throw error;
    }
  }, [selectedClient, fetchClientData]);

  const handleMiscDeleteRow = useCallback(async (
    row: any
  ): Promise<boolean> => {
    if (!selectedClient) return false;
    try {
      const response = await fetch(`/api/data/misc/${selectedClient}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: row._columnKey ? 'deleteNote' : 'deleteRow',
          rowIndex: row._rowIndex,
          columnKey: row._columnKey,
        }),
      });
      const result = await response.json();
      if (result.success) {
        fetchClientData();
        return true;
      } else {
        alert(`Failed to delete: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('Failed to delete misc record:', error);
      alert('Failed to delete. Please try again.');
      return false;
    }
  }, [selectedClient, fetchClientData]);

  // Save selected client to localStorage and server
  const saveClientPreference = useCallback(async (client: string) => {
    // Always save to localStorage for immediate access
    localStorage.setItem(CLIENT_STORAGE_KEY, client);

    // Save to server if authenticated
    const token = localStorage.getItem("token");
    if (token && client) {
      try {
        await fetch("/api/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            key: PREFERENCE_KEYS.SELECTED_CLIENT,
            value: client,
          }),
        });
      } catch (error) {
        console.debug("Failed to save client preference to server:", error);
      }
    }
  }, []);

  // Handle client selection change
  const handleClientChange = useCallback((client: string) => {
    setSelectedClient(client);
    setWorkspaceSearch('');
    if (client) {
      saveClientPreference(client);
    }
  }, [saveClientPreference]);

  useEffect(() => {
    const selected = clients.find(client => client.value === selectedClient);
    if (selected) {
      setClientSearch(selected.label);
      setClientSearchDirty(false);
    }
  }, [clients, selectedClient]);

  useEffect(() => {
    setActiveClientIndex(0);
  }, [clientSearch]);

  useEffect(() => {
    if (clientPickerOpen) {
      clientSearchInputRef.current?.focus();
      clientSearchInputRef.current?.select();
    }
  }, [clientPickerOpen]);

  useEffect(() => {
    const closeClientPicker = (event: MouseEvent) => {
      if (!clientPickerRef.current?.contains(event.target as Node)) {
        setClientPickerOpen(false);
        const selected = clients.find(client => client.value === selectedClient);
        setClientSearch(selected?.label || "");
        setClientSearchDirty(false);
      }
    };

    document.addEventListener("mousedown", closeClientPicker);
    return () => document.removeEventListener("mousedown", closeClientPicker);
  }, [clients, selectedClient]);

  useEffect(() => {
    const closeContactMenu = (event: MouseEvent) => {
      if (!contactMenuRef.current?.contains(event.target as Node)) setContactMenuOpen(false);
    };

    document.addEventListener("mousedown", closeContactMenu);
    return () => document.removeEventListener("mousedown", closeContactMenu);
  }, []);

  useEffect(() => {
    const closeOverviewPicker = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!overviewPickerRef.current?.contains(target) && !overviewPickerMenuRef.current?.contains(target)) setOverviewPickerOpen(false);
    };

    document.addEventListener("mousedown", closeOverviewPicker);
    return () => document.removeEventListener("mousedown", closeOverviewPicker);
  }, []);

  useEffect(() => {
    if (openModal !== null) setOverviewPickerOpen(false);
  }, [openModal]);

  useEffect(() => {
    // Check authentication via API (supports runtime DISABLE_AUTH)
    const checkAuthAndLoadClients = async () => {
      try {
        // Check if auth is disabled via server config
        const configRes = await fetch("/api/config");
        const config = await configRes.json();
        setAppVersion(config.version || "");

        if (config.authDisabled) {
          // Auth disabled - use guest user
          setUser({ username: "guest", role: "admin" });
        } else {
          // Check session via /api/auth/me
          const meRes = await fetch("/api/auth/me");
          if (!meRes.ok) {
            router.push("/login");
            return;
          }
          const meData = await meRes.json();
          setUser(meData.user);
        }

        // Load clients
        const clientsRes = await fetch("/api/data/clients");
        const clientsData = await clientsRes.json();
        const clientList = clientsData.clients || [];
        setClients(clientList);
        setLoading(false);

        // Priority: 1. Server preference, 2. localStorage, 3. env default
        let savedClient = "";

        // Try to load from server first (skip if auth disabled)
        if (!config.authDisabled) {
          try {
            const prefRes = await fetch(`/api/preferences/${PREFERENCE_KEYS.SELECTED_CLIENT}`);
            if (prefRes.ok) {
              const prefData = await prefRes.json();
              if (prefData.data?.value) {
                savedClient = prefData.data.value;
              }
            }
          } catch (error) {
            console.debug("Failed to load client preference from server:", error);
          }
        }

        // Fall back to localStorage if no server preference
        if (!savedClient) {
          savedClient = localStorage.getItem(CLIENT_STORAGE_KEY) || "";
        }

        // Fall back to env default if still nothing
        if (!savedClient) {
          savedClient = process.env.NEXT_PUBLIC_DEFAULT_COMPANY || "";
        }

        // Validate that the saved client exists in the list
        if (savedClient && clientList.some((c: { value: string }) => c.value === savedClient)) {
          setSelectedClient(savedClient);
          localStorage.setItem(CLIENT_STORAGE_KEY, savedClient);
        }

        // Load sort preferences
        let sortPrefs: Record<string, SortConfig> = {};

        // Try to load from server first (skip if auth disabled)
        if (!config.authDisabled) {
          try {
            const sortPrefRes = await fetch(`/api/preferences/${SORT_PREFS_STORAGE_KEY}`);
            if (sortPrefRes.ok) {
              const sortPrefData = await sortPrefRes.json();
              if (sortPrefData.data?.value) {
                sortPrefs = JSON.parse(sortPrefData.data.value);
              }
            }
          } catch (error) {
            console.debug("Failed to load sort preferences from server:", error);
          }
        }

        // Fall back to localStorage if no server preference
        if (Object.keys(sortPrefs).length === 0) {
          const localSortPrefs = localStorage.getItem(SORT_PREFS_STORAGE_KEY);
          if (localSortPrefs) {
            try {
              sortPrefs = JSON.parse(localSortPrefs);
            } catch (e) {
              console.debug("Failed to parse local sort preferences:", e);
            }
          }
        }

        setSortPreferences(sortPrefs);

        // Check if whois tool is available (for websites autopopulate)
        try {
          const whoisRes = await fetch("/api/whois?action=check");
          const whoisData = await whoisRes.json();
          setWhoisAvailable(whoisData.available === true);
        } catch {
          // Silently ignore - whois just won't be available
        }
      } catch (err) {
        console.error("Failed to load:", err);
        setLoading(false);
      }
    };

    checkAuthAndLoadClients();
  }, [router]);

  // Fetch data when client is selected
  useEffect(() => {
    if (selectedClient) {
      fetchClientData();
    } else {
      setExternalInfo([]);
      setCoreInfra([]);
      setWorkstationsUsers([]);
      setManagedInfo([]);
      setAdminCredentials({
        adminEmails: [],
        voipLogins: [],
        acronisBackups: [],
        cloudflareAdmins: []
      });
      setGuacamoleHosts([]);
      setDevices([]);
      setContainers([]);
      setVms([]);
      setDaemons([]);
      setServices([]);
      setDomains([]);
      setCameras([]);
      setEmails([]);
      setUsers([]);
      setWorkstations([]);
      setMiscData([]);
      setPhoneNumbers([]);
      setWebsites([]);
    }
  }, [selectedClient, fetchClientData]);

  const categoryOverviewPanel = (id: keyof typeof CATEGORY_TABLE_DEFINITIONS, data: any[]) => ({
    title: CATEGORY_TABLE_DEFINITIONS[id].title,
    modal: id,
    data,
    columns: getOverviewColumns(id),
  });

  const overviewPanelCatalog: Record<string, { title: string; modal: string; data: any[]; columns: Column[] }> = {
    externalNetwork: {
      title: 'Firewalls & Routers', modal: 'networkDevices',
      data: networkDevices.filter(device => /firewall|router/i.test(String(device['Device Type'] || ''))),
      columns: getOverviewColumns('networkDevices'),
    },
    accountsAccess: categoryOverviewPanel('accountsAccess', accessAccounts),
    adminCredentials: {
      title: 'Admin Credentials', modal: 'adminCredentials',
      data: accessAccounts.filter(account => account['Owner Type'] === 'Administrative' || account['Account Type'] === 'VoIP Administration'),
      columns: [
        { key: 'Account Type', label: 'Type' }, { key: 'Account', label: 'Account' },
        { key: 'Resource', label: 'Resource' }, { key: 'Password', label: 'Password', type: 'password' },
      ],
    },
    userDirectory: categoryOverviewPanel('userDirectory', allUserRecords),
    usersModal: categoryOverviewPanel('usersModal', userDirectory),
    emails: categoryOverviewPanel('emails', emails),
    mfaAttention: {
      title: 'MFA Attention', modal: 'emails',
      data: emails.filter(email => isAffirmativeValue(email.Active) && !isAffirmativeValue(email['MFA or Ignore'])),
      columns: getOverviewColumns('emails'),
    },
    misc: categoryOverviewPanel('misc', miscData),
    allDevices: categoryOverviewPanel('allDevices', allDevices),
    workstationsRaw: categoryOverviewPanel('workstationsRaw', workstations),
    domainAD: categoryOverviewPanel('domainAD', serverDirectoryRows),
    domainControllers: {
      title: 'Domain Controllers', modal: 'domainAD',
      data: serverDirectoryRows.filter(server => server['Directory Role'] === 'Domain Controller'),
      columns: [
        { key: 'Name', label: 'Server' }, { key: 'Local Domain', label: 'Domain' },
        { key: 'IP address', label: 'IP Address', type: 'ip' }, { key: 'Login', label: 'Administrator' },
      ],
    },
    networkDevices: categoryOverviewPanel('networkDevices', networkDevices),
    devices: categoryOverviewPanel('devices', devices),
    camerasModal: categoryOverviewPanel('camerasModal', cameras),
    systemsServices: categoryOverviewPanel('systemsServices', systemsServices),
    vms: categoryOverviewPanel('vms', systemsServices.filter(item => item.Category === 'Virtualization')),
    servicesModal: categoryOverviewPanel('servicesModal', applicationsProviders),
    serviceProviders: {
      title: 'Service Providers', modal: 'servicesModal',
      data: applicationsProviders.filter(record => record['Record Type'] === 'Provider'),
      columns: [
        { key: 'Name', label: 'Provider' }, { key: 'Service Type', label: 'Service' },
        { key: 'Contact', label: 'Contact' }, { key: 'Phone', label: 'Phone' },
        { key: 'Email', label: 'Email', type: 'email' },
      ],
    },
    websitesModal: categoryOverviewPanel('websitesModal', websites),
  };

  const readOverviewDrag = (event: DragEvent<HTMLElement>) => {
    const value = event.dataTransfer.getData('text/plain');
    return value.startsWith('cdms-overview:') ? value.slice('cdms-overview:'.length) : overviewDragPanelRef.current;
  };

  const arrangeOverviewPanels = (panelIds: string[]): OverviewLayoutItem[] => {
    const count = panelIds.length;
    if (count === 1) return [{ id: panelIds[0], column: 1, row: 1, columns: 12, rows: 12 }];
    if (count === 2) return panelIds.map((id, index) => ({ id, column: index * 6 + 1, row: 1, columns: 6, rows: 12 }));
    if (count === 3) return panelIds.map((id, index) => index < 2
      ? { id, column: index * 6 + 1, row: 1, columns: 6, rows: 6 }
      : { id, column: 1, row: 7, columns: 12, rows: 6 });
    if (count === 4) return panelIds.map((id, index) => ({
      id,
      column: (index % 2) * 6 + 1,
      row: Math.floor(index / 2) * 6 + 1,
      columns: 6,
      rows: 6,
    }));
    if (count === 5) return panelIds.map((id, index) => index < 2
      ? { id, column: index * 6 + 1, row: 1, columns: 6, rows: 6 }
      : { id, column: (index - 2) * 4 + 1, row: 7, columns: 4, rows: 6 });
    return panelIds.slice(0, MAX_OVERVIEW_PANELS).map((id, index) => ({
      id,
      column: (index % 3) * 4 + 1,
      row: Math.floor(index / 3) * 6 + 1,
      columns: 4,
      rows: 6,
    }));
  };

  const findOverviewOpening = (panelId: string): OverviewLayoutItem | null => {
    const preferredSlot = DEFAULT_OVERVIEW_LAYOUT.find(item => item.id === panelId);
    if (preferredSlot && !overviewLayout.some(item => overviewItemsOverlap(preferredSlot, item))) return { ...preferredSlot };

    for (const [columns, rows] of [[6, 5], [6, 4], [4, 6], [4, 4]] as Array<[number, number]>) {
      for (let row = 1; row <= OVERVIEW_ROWS - rows + 1; row += 1) {
        for (let column = 1; column <= OVERVIEW_COLUMNS - columns + 1; column += 1) {
          const candidate = { id: panelId, column, row, columns, rows };
          if (!overviewLayout.some(item => overviewItemsOverlap(candidate, item))) return candidate;
        }
      }
    }
    return null;
  };

  const buildOverviewDropLayout = (panelId: string, targetId?: string) => {
    const sourceIndex = overviewLayout.findIndex(item => item.id === panelId);
    const targetIndex = targetId ? overviewLayout.findIndex(item => item.id === targetId) : -1;
    if (sourceIndex >= 0 && targetIndex >= 0) {
      if (sourceIndex === targetIndex) return overviewLayout;
      const source = overviewLayout[sourceIndex];
      const target = overviewLayout[targetIndex];
      return overviewLayout.map(item => {
        if (item.id === source.id) return { ...item, column: target.column, row: target.row, columns: target.columns, rows: target.rows };
        if (item.id === target.id) return { ...item, column: source.column, row: source.row, columns: source.columns, rows: source.rows };
        return item;
      });
    }
    if (sourceIndex === -1) {
      if (overviewLayout.length >= MAX_OVERVIEW_PANELS) return overviewLayout;
      const opening = findOverviewOpening(panelId);
      if (opening) return [...overviewLayout, opening];

      const panelIds = overviewLayout.map(item => item.id);
      panelIds.splice(targetIndex >= 0 ? targetIndex + 1 : panelIds.length, 0, panelId);
      return arrangeOverviewPanels(panelIds);
    }
    return overviewLayout;
  };

  const addOverviewPanel = (panelId: string) => {
    if (!overviewPanelCatalog[panelId] || overviewLayout.some(item => item.id === panelId) || overviewLayout.length >= MAX_OVERVIEW_PANELS) return;
    captureOverviewRects();
    setMaximizedOverviewPanel(null);
    setOverviewLayout(buildOverviewDropLayout(panelId));
    setOverviewPickerOpen(false);
  };

  const resolveOverviewDropTarget = (event: DragEvent<HTMLElement>, requestedTarget?: string) => {
    if (requestedTarget) return requestedTarget;
    for (const [panelId, rect] of overviewDragRectsRef.current) {
      if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        return panelId;
      }
    }
    return undefined;
  };

  const clearOverviewDragPreview = () => {
    if (overviewDragFromSidebarRef.current) suppressSidebarClickUntilRef.current = Date.now() + 250;
    overviewDragFromSidebarRef.current = false;
    overviewDragPanelRef.current = '';
    overviewDragOffsetRef.current = { column: 0, row: 0 };
    overviewDragRectsRef.current.clear();
    setOverviewInteraction(null);
  };

  const beginOverviewDrag = (event: DragEvent<HTMLElement>, panelId: string) => {
    setOverviewPickerOpen(false);
    const fromSidebar = Boolean(event.currentTarget.closest('.cdms-sidebar'));
    overviewDragFromSidebarRef.current = fromSidebar;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `cdms-overview:${panelId}`);
    overviewDragPanelRef.current = panelId;
    const draggedItem = overviewLayout.find(item => item.id === panelId);
    const draggedElement = event.currentTarget.closest<HTMLElement>('[data-overview-panel]');
    if (draggedItem && draggedElement) {
      const rect = draggedElement.getBoundingClientRect();
      overviewDragOffsetRef.current = {
        column: Math.min(draggedItem.columns - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / Math.max(rect.width, 1)) * draggedItem.columns))),
        row: Math.min(draggedItem.rows - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / Math.max(rect.height, 1)) * draggedItem.rows))),
      };
    }
    const refreshDragRects = () => {
      const grid = overviewGridRef.current;
      overviewDragRectsRef.current = new Map(
        grid
          ? Array.from(grid.querySelectorAll<HTMLElement>('[data-overview-panel]')).map(element => [
              element.dataset.overviewPanel || '',
              element.getBoundingClientRect(),
            ] as const).filter(([id]) => Boolean(id))
          : []
      );
    };
    refreshDragRects();
    setOverviewInteraction({ type: 'drag', panelId });
    if (maximizedOverviewPanel) {
      captureOverviewRects();
      setMaximizedOverviewPanel(null);
    }
    event.currentTarget.addEventListener('dragend', clearOverviewDragPreview, { once: true });
  };

  const previewOverviewDrop = (event: DragEvent<HTMLElement>, targetId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const panelId = readOverviewDrag(event);
    if (!overviewPanelCatalog[panelId]) return;
    if (!overviewLayout.some(item => item.id === panelId) && overviewLayout.length >= MAX_OVERVIEW_PANELS) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    targetId = resolveOverviewDropTarget(event, targetId);
    if (overviewInteraction?.type === 'drag' && overviewInteraction.panelId === panelId && overviewInteraction.targetId === targetId) return;
    setOverviewInteraction({ type: 'drag', panelId, targetId });
  };

  const handleOverviewDrop = (event: DragEvent<HTMLElement>, targetId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const panelId = readOverviewDrag(event);
    if (!overviewPanelCatalog[panelId]) return;
    targetId = resolveOverviewDropTarget(event, targetId);
    let nextLayout: OverviewLayoutItem[] | null = null;
    if (!targetId && overviewLayout.some(item => item.id === panelId) && overviewGridRef.current) {
      const gridRect = overviewGridRef.current.getBoundingClientRect();
      const pointerColumn = Math.min(OVERVIEW_COLUMNS, Math.max(1, Math.floor(((event.clientX - gridRect.left) / Math.max(gridRect.width, 1)) * OVERVIEW_COLUMNS) + 1));
      const pointerRow = Math.min(OVERVIEW_ROWS, Math.max(1, Math.floor(((event.clientY - gridRect.top) / Math.max(gridRect.height, 1)) * OVERVIEW_ROWS) + 1));
      nextLayout = placeOverviewPanel(
        overviewLayout,
        panelId,
        pointerColumn - overviewDragOffsetRef.current.column,
        pointerRow - overviewDragOffsetRef.current.row,
        OVERVIEW_COLUMNS,
        OVERVIEW_ROWS,
      );
    }
    nextLayout ??= buildOverviewDropLayout(panelId, targetId);
    captureOverviewRects();
    setOverviewLayout(nextLayout);
    setOverviewInteraction(null);
    overviewDragPanelRef.current = '';
    overviewDragOffsetRef.current = { column: 0, row: 0 };
    overviewDragRectsRef.current.clear();
  };

  const beginOverviewResize = (event: ReactPointerEvent<HTMLButtonElement>, panelId: string, direction: OverviewResizeDirection) => {
    event.preventDefault();
    event.stopPropagation();
    if (maximizedOverviewPanel === panelId) return;
    const grid = overviewGridRef.current;
    const panel = overviewLayout.find(item => item.id === panelId);
    if (!grid || !panel) return;

    overviewResizeCleanupRef.current?.();
    const gridRect = grid.getBoundingClientRect();
    const gridStyles = window.getComputedStyle(grid);
    const columnGap = Number.parseFloat(gridStyles.columnGap) || 0;
    const rowGap = Number.parseFloat(gridStyles.rowGap) || 0;
    const columnUnit = (gridRect.width - columnGap * (OVERVIEW_COLUMNS - 1)) / OVERVIEW_COLUMNS + columnGap;
    const rowUnit = (gridRect.height - rowGap * (OVERVIEW_ROWS - 1)) / OVERVIEW_ROWS + rowGap;
    const startX = event.clientX;
    const startY = event.clientY;
    const startPanel = { ...panel };
    const startLayout = overviewLayout.map(item => ({ ...item }));
    const previousUserSelect = document.body.style.userSelect;
    let lastLayout = startLayout;
    document.body.style.userSelect = 'none';

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 4) return;
      const columnDelta = direction.includes('e') || direction.includes('w')
        ? Math.round((moveEvent.clientX - startX) / columnUnit)
        : 0;
      const rowDelta = direction.includes('n') || direction.includes('s')
        ? Math.round((moveEvent.clientY - startY) / rowUnit)
        : 0;
      const nextLayout = resizeOverviewLayout(startLayout, panelId, direction, columnDelta, rowDelta, {
        columns: OVERVIEW_COLUMNS,
        rows: OVERVIEW_ROWS,
        minimumColumns: MIN_OVERVIEW_COLUMNS,
        minimumRows: MIN_OVERVIEW_ROWS,
      });

      if (JSON.stringify(nextLayout) === JSON.stringify(lastLayout)) return;
      lastLayout = nextLayout;
      const resizedPanel = nextLayout.find(item => item.id === panelId) || startPanel;
      setOverviewInteraction({ type: 'resize', panelId, columns: resizedPanel.columns, rows: resizedPanel.rows });
      setOverviewLayout(nextLayout);
    };
    const finishResize = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishResize);
      window.removeEventListener('pointercancel', finishResize);
      document.body.style.userSelect = previousUserSelect;
      overviewResizeCleanupRef.current = null;
      setOverviewInteraction(null);
    };

    overviewResizeCleanupRef.current = finishResize;
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishResize);
    window.addEventListener('pointercancel', finishResize);
  };

  const toggleOverviewPanelSize = (panelId: string) => {
    setOverviewPickerOpen(false);
    captureOverviewRects();
    setMaximizedOverviewPanel(current => current === panelId ? null : panelId);
  };

  const resetOverviewLayout = () => {
    captureOverviewRects();
    setMaximizedOverviewPanel(null);
    setOverviewInteraction(null);
    setOverviewLayout(DEFAULT_OVERVIEW_LAYOUT);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("user"); // Clear any cached user data
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="cdms-shell h-screen flex flex-col">
      <V1Celebration />
      {/* Compact Header */}
      <header className="cdms-topbar flex-shrink-0 h-[66px]">
        <div className="px-6 h-full flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="cdms-brand-mark" aria-hidden="true"><span /><span /><span /></div>
            <div className="cdms-brand-copy">
              <h1 className="m-0 flex items-center leading-none"><TitleEater title="CDMS" /></h1>
            </div>
            {/* Navigation Buttons */}
            {selectedClient && (
              <div className="hidden">
                <button
                  onClick={() => window.open('http://192.168.203.241:6029/attendance', '_blank')}
                  className="px-2 py-1 border border-blue-500 rounded-md bg-blue-500 text-white cursor-pointer text-xs font-medium transition-all hover:bg-blue-600"
                  title="Open Attendance"
                >
                  Attend
                </button>
                <button
                  onClick={() => setOpenModal('misc')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Notes
                </button>
                <button
                  onClick={() => setOpenModal('allDevices')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Dev
                </button>
                <button
                  onClick={() => setOpenModal('vms')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  VMs
                </button>
                <button
                  onClick={() => setOpenModal('emails')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Email
                </button>
                <button
                  onClick={() => setOpenModal('servicesModal')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Svc
                </button>
                <button
                  onClick={() => setOpenModal('usersModal')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Users
                </button>
                <button
                  onClick={() => setOpenModal('workstationsRaw')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  WS
                </button>
                <button
                  onClick={() => setOpenModal('websitesModal')}
                  className="px-2 py-1 border border-gray-500 dark:border-gray-500 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-xs font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  Sites
                </button>
                <button
                  onClick={() => setOpenModal('reports')}
                  className="px-2 py-1 border border-purple-500 dark:border-purple-500 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 cursor-pointer text-xs font-medium transition-all hover:bg-purple-100 dark:hover:bg-purple-900/50"
                >
                  Reports
                </button>
              </div>
            )}
          </div>
          <div className="cdms-header-client">
            <button
              type="button"
              className="cdms-guac-button"
              disabled={!guacamoleUrl}
              title={guacamoleUrl ? `Open Guacamole for ${selectedClientRecord?.label || selectedClient}` : 'No Guacamole link configured'}
              aria-label={guacamoleUrl ? `Open Guacamole for ${selectedClientRecord?.label || selectedClient}` : 'No Guacamole link configured'}
              onClick={() => {
                if (guacamoleUrl) window.open(guacamoleUrl, '_blank', 'noopener,noreferrer');
              }}
            >
              <AvocadoIcon />
            </button>
            <div className="cdms-contact-control" ref={contactMenuRef}>
              <button
                type="button"
                className={`cdms-contact-button ${contactMenuOpen ? 'is-open' : ''}`}
                disabled={!selectedClient}
                title={selectedClient ? `Contact information for ${selectedClientRecord?.label || selectedClient}` : 'Select a client to view contacts'}
                aria-label={selectedClient ? `Contact information for ${selectedClientRecord?.label || selectedClient}` : 'Select a client to view contacts'}
                aria-expanded={contactMenuOpen}
                aria-controls="client-contact-menu"
                onClick={() => {
                  setClientPickerOpen(false);
                  setContactMenuOpen(open => !open);
                }}
              >
                <Phone aria-hidden="true" />
              </button>
              {contactMenuOpen && (
                <div id="client-contact-menu" className="cdms-contact-menu" role="dialog" aria-label="Client contact information">
                    <header className="cdms-contact-menu-header">
                      <div>
                        <strong>Contact Information</strong>
                        <span>{selectedClientRecord?.label || selectedClient}</span>
                      </div>
                      <small>{phoneNumbers.length + peopleContacts.length + providerContacts.length}</small>
                    </header>

                    <div className="cdms-contact-menu-body">
                      <section className="cdms-contact-section">
                        <h3>Main Phones</h3>
                        {phoneNumbers.length > 0 ? phoneNumbers.map((phone, index) => (
                          <a key={`${phone.Number}-${index}`} className="cdms-contact-primary" href={`tel:${phone.Number}`}>
                            <Phone size={14} aria-hidden="true" />
                            <span>
                              <strong>{phone.Number}</strong>
                              <small>{phone.Name || phone.Type || phone.Location || (index === 0 ? 'Primary number' : 'Additional number')}</small>
                            </span>
                          </a>
                        )) : <p className="cdms-contact-empty">No client phone numbers available.</p>}
                      </section>

                      <section className="cdms-contact-section">
                        <div className="cdms-contact-section-heading">
                          <button type="button" onClick={() => { setContactMenuOpen(false); setOpenModal('usersModal'); }}>People</button>
                        </div>
                        <div className="cdms-contact-list">
                          {peopleContacts.length > 0 ? peopleContacts.map((person, index) => (
                            <article key={`${person.Name || person.Login}-${index}`} className="cdms-contact-entry">
                              <div className="cdms-contact-entry-title">
                                <strong>{person.Name || person.Login}</strong>
                                {person.SubName && <small>{person.SubName}</small>}
                              </div>
                              <div className="cdms-contact-links">
                                {person.Phone && <a href={`tel:${person.Phone}`}>{person.Phone}</a>}
                                {person.Email && <a href={`mailto:${person.Email}`}>{person.Email}</a>}
                              </div>
                            </article>
                          )) : <p className="cdms-contact-empty">No individual contact details available.</p>}
                        </div>
                      </section>

                      <section className="cdms-contact-section">
                        <div className="cdms-contact-section-heading">
                          <button type="button" onClick={() => { setContactMenuOpen(false); setOpenModal('servicesModal'); }}>Service Providers</button>
                        </div>
                        <div className="cdms-contact-list">
                          {providerContacts.length > 0 ? providerContacts.map((contact, index) => (
                            <article key={`${contact.Name || contact.Contact}-${index}`} className="cdms-contact-entry">
                              <div className="cdms-contact-entry-title">
                                <strong>{contact.Name || contact.Contact || 'Service contact'}</strong>
                                {(contact.Contact || contact['Service Type']) && <small>{[contact.Contact, contact['Service Type']].filter(Boolean).join(' · ')}</small>}
                              </div>
                              <div className="cdms-contact-links">
                                {String(contact.Phone || '').split(' / ').filter(Boolean).map((phone, phoneIndex) => <a key={`${phone}-${phoneIndex}`} href={`tel:${phone}`}>{phone}</a>)}
                                {contact.Email && <a href={`mailto:${contact.Email}`}>{contact.Email}</a>}
                                {contact.Account && <span>Account {contact.Account}</span>}
                              </div>
                            </article>
                          )) : <p className="cdms-contact-empty">No service-provider contacts available.</p>}
                        </div>
                      </section>
                    </div>

                  </div>
              )}
            </div>
            <div className={`cdms-client-picker ${clientPickerOpen ? 'is-open' : ''}`} ref={clientPickerRef}>
              <div className={`cdms-client-search ${clientPickerOpen ? 'is-open' : ''}`} title={!clientPickerOpen ? selectedClientRecord?.label : undefined}>
                <input
                  ref={clientSearchInputRef}
                  id="client-select"
                  type="search"
                  role="combobox"
                  aria-label="Search clients"
                  aria-autocomplete="list"
                  aria-controls="client-suggestions"
                  aria-expanded={clientPickerOpen}
                  aria-activedescendant={clientPickerOpen && filteredClients[activeClientIndex] ? `client-option-${filteredClients[activeClientIndex].value}` : undefined}
                  value={clientPickerOpen ? clientSearch : (selectedClientRecord?.label || '')}
                  placeholder={loading ? 'Loading clients…' : 'Search clients…'}
                  autoComplete="off"
                  disabled={loading}
                  onFocus={() => {
                    setContactMenuOpen(false);
                    if (!clientPickerOpen) {
                      setClientSearch(selectedClientRecord?.label || '');
                      setClientSearchDirty(false);
                      setClientPickerOpen(true);
                    }
                  }}
                  onChange={(event) => {
                    setClientSearch(event.target.value);
                    setClientSearchDirty(true);
                    setClientPickerOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      setClientPickerOpen(true);
                      setActiveClientIndex(index => Math.min(index + 1, Math.max(filteredClients.length - 1, 0)));
                    } else if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      setActiveClientIndex(index => Math.max(index - 1, 0));
                    } else if (event.key === 'Enter' && clientPickerOpen && filteredClients[activeClientIndex]) {
                      event.preventDefault();
                      const client = filteredClients[activeClientIndex];
                      setClientSearch(client.label);
                      setClientSearchDirty(false);
                      handleClientChange(client.value);
                      setClientPickerOpen(false);
                    } else if (event.key === 'Escape') {
                      setClientPickerOpen(false);
                      setClientSearch(selectedClientRecord?.label || '');
                      setClientSearchDirty(false);
                    }
                  }}
                />
                <div className="cdms-client-actions" aria-label="Client actions">
                  <button type="button" className="cdms-client-action" title="Add client" aria-label="Add client" onClick={() => { setClientPickerOpen(false); setCompanyModalMode('add'); }}>
                    <Plus size={16} strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className="cdms-client-action"
                    title="Configure current client"
                    aria-label="Configure current client"
                    disabled={!selectedClient}
                    onClick={() => {
                      setClientPickerOpen(false);
                      if (selectedClientRecord) void handleSelectCompanyForUpdate({ companyLabel: selectedClientRecord.label });
                    }}
                  >
                    <Settings2 size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>
              {clientPickerOpen && (
                <div id="client-suggestions" className="cdms-client-suggestions" role="listbox">
                  <div className="cdms-client-suggestions-head">
                    <span>{clientSearchDirty && clientSearch.trim() ? 'Suggestions' : 'All clients'}</span>
                    <small>{filteredClients.length}</small>
                  </div>
                  {filteredClients.length > 0 ? filteredClients.map((client, index) => (
                    <button
                      id={`client-option-${client.value}`}
                      key={client.value}
                      type="button"
                      role="option"
                      aria-selected={selectedClient === client.value}
                      className={`cdms-client-option ${index === activeClientIndex ? 'is-active' : ''} ${selectedClient === client.value ? 'is-selected' : ''}`}
                      onMouseEnter={() => setActiveClientIndex(index)}
                      onClick={() => { setClientSearch(client.label); setClientSearchDirty(false); handleClientChange(client.value); setClientPickerOpen(false); }}
                    >
                      <span className="cdms-client-monogram">{client.value.slice(0, 2)}</span>
                      <span className="cdms-client-option-copy"><strong>{client.label}</strong>{client.group && <small>{client.group}</small>}</span>
                      {selectedClient === client.value && <span className="cdms-client-check">✓</span>}
                    </button>
                  )) : (
                    <div className="cdms-client-empty">No clients match “{clientSearch}”</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={fetchClientData}
              disabled={!selectedClient || loadingData}
              className="cdms-toolbar-action"
              title="Refresh client data"
              aria-label="Refresh client data"
            >
              <RefreshCw size={16} className={loadingData ? 'animate-spin' : ''} />
            </button>
            <div className="relative">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setUserMenuOpen(open => !open);
                }}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <span className="font-medium">{user.username}</span>
                <span className="text-xs">▼</span>
              </button>
              {userMenuOpen && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  {/* Dropdown menu */}
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50 py-1">
                  {/* Theme options */}
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">
                    Theme
                  </div>
                  <button
                    onClick={() => setTheme('light')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'light' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>☀️</span> Light {theme === 'light' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'dark' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>🌙</span> Dark {theme === 'dark' && '✓'}
                  </button>
                  <button
                    onClick={() => setTheme('system')}
                    className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      theme === 'system' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>💻</span> System {theme === 'system' && '✓'}
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      resetOverviewLayout();
                      setUserMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <RotateCcw size={14} /> Reset Overview
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  {/* Logout */}
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Logout
                    </button>
                    {appVersion && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <div className="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">
                          Version {appVersion}
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="cdms-workspace flex-1 min-h-0 flex">
        <aside
          className="cdms-sidebar"
          aria-label="Client data navigation"
          onClickCapture={(event) => {
            if (Date.now() < suppressSidebarClickUntilRef.current) {
              event.preventDefault();
              event.stopPropagation();
              suppressSidebarClickUntilRef.current = 0;
            }
          }}
        >
          <div className="cdms-workspace-search">
            <div className="cdms-workspace-search-input">
              <Search size={15} aria-hidden="true" />
              <input
                type="search"
                value={workspaceSearch}
                onChange={(event) => setWorkspaceSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setWorkspaceSearch('');
                  if (event.key === 'Enter' && workspaceSearch.trim()) {
                    event.preventDefault();
                    setSubmittedWorkspaceSearch(workspaceSearch.trim());
                    setOpenModal('searchResults');
                    setWorkspaceSearch('');
                  }
                }}
                placeholder={selectedClient ? 'Find fields or values…' : 'Select a client first'}
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
                      setOpenModal(result.modal);
                      setWorkspaceSearch('');
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
            <div className={`cdms-nav-parent-row cdms-overview-nav-row ${openModal === null ? 'active' : ''}`} ref={overviewPickerRef}>
              <button
                className="cdms-nav-item cdms-nav-parent-select"
                onClick={() => { setOpenModal(null); setOverviewPickerOpen(false); }}
              >
                <span className="cdms-nav-icon"><LayoutDashboard aria-hidden="true" /></span>
                <span>Overview</span>
              </button>
              <button
                type="button"
                className="cdms-overview-nav-add"
                disabled={!selectedClient || overviewLayout.length >= MAX_OVERVIEW_PANELS}
                onClick={() => {
                  setOpenModal(null);
                  setOverviewPickerOpen(open => !open);
                }}
                aria-expanded={overviewPickerOpen}
                aria-controls="overview-panel-picker"
                title={overviewLayout.length >= MAX_OVERVIEW_PANELS ? 'Overview already has six panels' : 'Add an overview panel'}
                aria-label={overviewLayout.length >= MAX_OVERVIEW_PANELS ? 'Overview already has six panels' : 'Add an overview panel'}
              >
                <Plus size={15} aria-hidden="true" />
              </button>
            </div>
            <button className={`cdms-nav-item ${openModal === 'reports' ? 'active' : ''}`} onClick={() => setOpenModal('reports')} disabled={!selectedClient}><span className="cdms-nav-icon"><FileChartColumn aria-hidden="true" /></span>Reports</button>
            <button className={`cdms-nav-item ${openModal === 'misc' ? 'active' : ''}`} onClick={() => setOpenModal('misc')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'misc')} disabled={!selectedClient}><span className="cdms-nav-icon"><NotebookPen aria-hidden="true" /></span>Notes</button>
          </div>
          <div className="cdms-sidebar-section">
            <div className={`cdms-nav-parent-row ${openModal === 'userDirectory' ? 'active' : ''}`}>
              <button
                className="cdms-nav-item cdms-nav-parent-select"
                onClick={() => setOpenModal('userDirectory')}
                draggable={!!selectedClient && openModal === null}
                onDragStart={(event) => beginOverviewDrag(event, 'userDirectory')}
                disabled={!selectedClient}
              >
                <span className="cdms-nav-icon"><Users aria-hidden="true" /></span>
                <span>Users</span>
              </button>
              <button
                type="button"
                className="cdms-nav-parent-toggle"
                onClick={() => setUsersExpanded(expanded => !expanded)}
                aria-expanded={usersExpanded}
                aria-controls="user-navigation-items"
                aria-label={`${usersExpanded ? 'Collapse' : 'Expand'} Users categories`}
                title={`${usersExpanded ? 'Collapse' : 'Expand'} Users categories`}
              >
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            {usersExpanded && (
              <div id="user-navigation-items" className="cdms-nav-children">
                <button className={`cdms-nav-item ${openModal === 'usersModal' ? 'active' : ''}`} onClick={() => setOpenModal('usersModal')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'usersModal')} disabled={!selectedClient}><span className="cdms-nav-icon"><Contact aria-hidden="true" /></span>People</button>
                <button className={`cdms-nav-item ${openModal === 'emails' ? 'active' : ''}`} onClick={() => setOpenModal('emails')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'emails')} disabled={!selectedClient}><span className="cdms-nav-icon"><Mail aria-hidden="true" /></span>Email &amp; Mailboxes</button>
                <button className={`cdms-nav-item ${openModal === 'accountsAccess' ? 'active' : ''}`} onClick={() => setOpenModal('accountsAccess')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'accountsAccess')} disabled={!selectedClient}><span className="cdms-nav-icon"><KeyRound aria-hidden="true" /></span>Accounts &amp; Access</button>
              </div>
            )}
          </div>
          <div className="cdms-sidebar-section">
            <div className={`cdms-nav-parent-row ${openModal === 'allDevices' ? 'active' : ''}`}>
              <button
                className="cdms-nav-item cdms-nav-parent-select"
                onClick={() => setOpenModal('allDevices')}
                draggable={!!selectedClient && openModal === null}
                onDragStart={(event) => beginOverviewDrag(event, 'allDevices')}
                disabled={!selectedClient}
              >
                <span className="cdms-nav-icon"><HardDrive aria-hidden="true" /></span>
                <span>Devices</span>
              </button>
              <button
                type="button"
                className="cdms-nav-parent-toggle"
                onClick={() => setDevicesExpanded(expanded => !expanded)}
                aria-expanded={devicesExpanded}
                aria-controls="device-navigation-items"
                aria-label={`${devicesExpanded ? 'Collapse' : 'Expand'} Devices categories`}
                title={`${devicesExpanded ? 'Collapse' : 'Expand'} Devices categories`}
              >
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            {devicesExpanded && (
              <div id="device-navigation-items" className="cdms-nav-children">
                <button className={`cdms-nav-item ${openModal === 'workstationsRaw' ? 'active' : ''}`} onClick={() => setOpenModal('workstationsRaw')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'workstationsRaw')} disabled={!selectedClient}><span className="cdms-nav-icon"><Monitor aria-hidden="true" /></span>Workstations</button>
                <button className={`cdms-nav-item ${openModal === 'domainAD' ? 'active' : ''}`} onClick={() => setOpenModal('domainAD')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'domainAD')} disabled={!selectedClient}><span className="cdms-nav-icon"><Server aria-hidden="true" /></span>Servers &amp; Directory</button>
                <button className={`cdms-nav-item ${openModal === 'networkDevices' ? 'active' : ''}`} onClick={() => setOpenModal('networkDevices')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'networkDevices')} disabled={!selectedClient}><span className="cdms-nav-icon"><EthernetIcon /></span>Network Devices</button>
                <button className={`cdms-nav-item ${openModal === 'devices' ? 'active' : ''}`} onClick={() => setOpenModal('devices')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'devices')} disabled={!selectedClient}><span className="cdms-nav-icon"><Printer aria-hidden="true" /></span>Print &amp; Scan</button>
                <button className={`cdms-nav-item ${openModal === 'camerasModal' ? 'active' : ''}`} onClick={() => setOpenModal('camerasModal')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'camerasModal')} disabled={!selectedClient}><span className="cdms-nav-icon"><Camera aria-hidden="true" /></span>Cameras &amp; Security</button>
              </div>
            )}
          </div>
          <div className="cdms-sidebar-section">
            <div className={`cdms-nav-parent-row ${openModal === 'systemsServices' ? 'active' : ''}`}>
              <button
                className="cdms-nav-item cdms-nav-parent-select"
                onClick={() => setOpenModal('systemsServices')}
                draggable={!!selectedClient && openModal === null}
                onDragStart={(event) => beginOverviewDrag(event, 'systemsServices')}
                disabled={!selectedClient}
              >
                <span className="cdms-nav-icon"><Workflow aria-hidden="true" /></span>
                <span>Services</span>
              </button>
              <button
                type="button"
                className="cdms-nav-parent-toggle"
                onClick={() => setSystemsExpanded(expanded => !expanded)}
                aria-expanded={systemsExpanded}
                aria-controls="systems-navigation-items"
                aria-label={`${systemsExpanded ? 'Collapse' : 'Expand'} Services categories`}
                title={`${systemsExpanded ? 'Collapse' : 'Expand'} Services categories`}
              >
                <ChevronDown size={15} aria-hidden="true" />
              </button>
            </div>
            {systemsExpanded && (
              <div id="systems-navigation-items" className="cdms-nav-children">
                <button className={`cdms-nav-item ${openModal === 'vms' ? 'active' : ''}`} onClick={() => setOpenModal('vms')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'vms')} disabled={!selectedClient}><span className="cdms-nav-icon"><Boxes aria-hidden="true" /></span>Virtualization</button>
                <button className={`cdms-nav-item ${openModal === 'servicesModal' ? 'active' : ''}`} onClick={() => setOpenModal('servicesModal')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'servicesModal')} disabled={!selectedClient}><span className="cdms-nav-icon"><AppWindow aria-hidden="true" /></span>Apps &amp; Providers</button>
                <button className={`cdms-nav-item ${openModal === 'websitesModal' ? 'active' : ''}`} onClick={() => setOpenModal('websitesModal')} draggable={!!selectedClient && openModal === null} onDragStart={(event) => beginOverviewDrag(event, 'websitesModal')} disabled={!selectedClient}><span className="cdms-nav-icon"><Globe aria-hidden="true" /></span>Websites &amp; DNS</button>
              </div>
            )}
          </div>
        </aside>

      {/* Main Content - Full Width, No Scroll */}
      <main className="cdms-main flex-1 overflow-hidden p-5 flex flex-col">
        {selectedClient && openModal ? (
          <div id="dashboard-section-panel" className="flex-1 min-h-0" />
        ) : selectedClient ? (
          <div
            className="cdms-overview-workspace"
            onDragOver={(event) => previewOverviewDrop(event)}
            onDrop={(event) => handleOverviewDrop(event)}
          >
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
                            <button type="button" key={option.id} onClick={() => addOverviewPanel(option.id)}>
                              <span><strong>{option.title}</strong><small>{option.description}</small></span>
                              <em>{option.source}</em>
                            </button>
                          ))}
                        </section>
                      )}
                      <section>
                        <h3>Categories</h3>
                        {CATEGORY_OVERVIEW_PANELS.filter(option => !overviewLayout.some(item => item.id === option.id)).map(option => (
                          <button type="button" key={option.id} onClick={() => addOverviewPanel(option.id)}>
                            <span><strong>{option.title}</strong><small>{option.description}</small></span>
                            <em>{option.source}</em>
                          </button>
                        ))}
                      </section>
                    </div>
                  </div>
            )}
            <div className={`cdms-overview-grid ${maximizedOverviewPanel ? 'is-maximized' : ''} ${overviewInteraction ? `is-${overviewInteraction.type}` : ''}`} ref={overviewGridRef}>
              {(maximizedOverviewPanel
                ? overviewLayout.filter(item => item.id === maximizedOverviewPanel)
                : overviewLayout
              ).map((item) => {
                const panel = overviewPanelCatalog[item.id];
                if (!panel) return null;
                const isMaximized = maximizedOverviewPanel === item.id;
                const isDropPreview = overviewInteraction?.type === 'drag' && overviewInteraction.targetId === item.id;
                const isInteracting = overviewInteraction?.type === 'drag' && overviewInteraction.panelId === item.id;
                return (
                  <OverviewPanel
                    key={item.id}
                    panelId={item.id}
                    title={panel.title}
                    className={`${isMaximized ? 'is-maximized' : ''} ${isDropPreview ? 'is-drop-preview' : ''} ${isInteracting ? 'is-interacting' : ''}`}
                    draggable={!isMaximized}
                    style={isMaximized
                      ? { gridColumn: '1 / -1', gridRow: '1 / -1' }
                      : { gridColumn: `${item.column} / span ${item.columns}`, gridRow: `${item.row} / span ${item.rows}` }}
                    onDragStart={(event) => beginOverviewDrag(event, item.id)}
                    onResizeStart={(event, direction) => beginOverviewResize(event, item.id, direction)}
                    onResizeToggle={() => toggleOverviewPanelSize(item.id)}
                    isMaximized={isMaximized}
                    resizePreview={overviewInteraction?.type === 'resize' && overviewInteraction.panelId === item.id
                      ? `${overviewInteraction.columns} × ${overviewInteraction.rows}`
                      : undefined}
                    onUnpin={() => {
                      captureOverviewRects();
                      if (maximizedOverviewPanel === item.id) setMaximizedOverviewPanel(null);
                      setOverviewLayout(current => current.filter(layoutItem => layoutItem.id !== item.id));
                    }}
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
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800 rounded-md">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2 text-gray-500 dark:text-gray-400">
                Select a client to view data
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Choose a client from the dropdown above
              </p>
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Data sections render into the main-panel host above. */}
      <FullPageModal
        isOpen={openModal === 'searchResults'}
        onClose={() => setOpenModal(null)}
        title={`Search Results | “${submittedWorkspaceSearch}”`}
      >
        <CategoryPanel
          description={`Every record containing “${submittedWorkspaceSearch}” in any searchable field. Select a result to open its source category.`}
          itemCount={submittedWorkspaceSearchResults.length}
          itemLabel="records"
        >
          <div className="cdms-global-search-results">
            {submittedWorkspaceSearchResults.length > 0 ? submittedWorkspaceSearchResults.map((result, index) => (
              <button
                key={`${result.modal}-${result.record}-${index}`}
                type="button"
                className="cdms-global-search-result"
                onClick={() => setOpenModal(result.modal)}
              >
                <span className="cdms-global-search-source">{result.section}</span>
                <span className="cdms-global-search-record">
                  <strong>{result.record}</strong>
                  <span className="cdms-global-search-matches">
                    {result.matches.map((match, matchIndex) => (
                      <span key={`${match.field}-${matchIndex}`}>
                        <b>{match.field}</b>
                        <span>{match.value}</span>
                      </span>
                    ))}
                  </span>
                </span>
                <span className="cdms-global-search-open">Open</span>
              </button>
            )) : (
              <div className="cdms-global-search-empty">No records contain “{submittedWorkspaceSearch}”.</div>
            )}
          </div>
        </CategoryPanel>
      </FullPageModal>
      <FullPageModal
        isOpen={openModal === 'coreInfra'}
        onClose={() => setOpenModal(null)}
        title={coreDeviceCategory === 'all' ? 'Core Infrastructure (Servers/Routers/Switches)' : coreDeviceCategory[0].toUpperCase() + coreDeviceCategory.slice(1)}
      >
        <DataTable
          data={visibleCoreInfra}
          columns={[
            { key: 'SubName', label: 'Location', sortable: true },
            { key: 'Name', label: 'Name', sortable: true },
            { key: 'Device Type', label: 'Device Type', sortable: true },
            { key: 'IP address', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'Machine Name / MAC', label: 'Machine Name/MAC', sortable: true },
            { key: 'Service Tag', label: 'Service Tag', sortable: true },
            { key: 'Description', label: 'Description', sortable: true },
            { key: 'Login', label: 'Login', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'Alt Login', label: 'Alt Login', sortable: true },
            { key: 'Alt Passwd', label: 'Alt Password', type: 'password', sortable: false },
            { key: 'Grouping', label: 'Grouping', sortable: true },
            { key: 'Cores', label: 'Cores', type: 'number', sortable: true },
            { key: 'Ram (GB)', label: 'RAM (GB)', type: 'number', sortable: true },
            { key: 'On Landing Page', label: 'Landing Page', type: 'checkbox', sortable: true },
            { key: 'RDP?', label: 'RDP', type: 'checkbox', sortable: true },
            { key: 'VNC?', label: 'VNC', type: 'checkbox', sortable: true },
            { key: 'SSH?', label: 'SSH', type: 'checkbox', sortable: true },
            { key: 'Web?', label: 'Web', type: 'checkbox', sortable: true },
            { key: 'AD Server', label: 'AD Server', type: 'checkbox', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="coreInfra"
          defaultSort={getSortConfig('coreInfra')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('core', row, columnKey, newValue, ['Client', 'Name', 'IP address'])}
          onAdd={() => setAddModalType('core')}
          onInactivate={(row) => handleInactivate('core', row, ['Client', 'Name', 'IP address'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'workstationsUsers'}
        onClose={() => setOpenModal(null)}
        title="Workstations + Users"
      >
        <DataTable
          data={workstationsUsers}
          columns={[
            { key: 'computerName', label: 'Computer Name', sortable: true },
            { key: 'location', label: 'Location', sortable: true },
            { key: 'userDisplay', label: 'Users', sortable: true, editable: false },
            { key: 'username', label: 'Primary User', sortable: true, editable: false },
            { key: 'ipAddress', label: 'IP Address', type: 'ip', sortable: true },
            { key: 'serviceTag', label: 'Service Tag', sortable: true },
            { key: 'cpu', label: 'CPU', sortable: true },
            { key: 'description', label: 'Description', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="workstationsUsers"
          defaultSort={getSortConfig('workstationsUsers')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={handleWorkstationsUsersEdit}
          onToggleActive={(row, active) => handleCellEdit('workstations', { Client: row._wsClient, 'Computer Name': row._wsComputerName }, 'Active', active ? 1 : 0, ['Client', 'Computer Name'])}
          onInactivate={(row) => handleInactivate('workstations', { Client: row._wsClient, 'Computer Name': row._wsComputerName }, ['Client', 'Computer Name'])}
          expandable={true}
          expandedRowRenderer={(row) => (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Users assigned to {row.computerName} ({row.userCount})
              </h4>
              {row.users && row.users.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Login</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Cell</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.users.map((user: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.login}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.phone || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.cell || '-'}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.subName || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-sm">No users assigned to this workstation</p>
              )}
            </div>
          )}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'externalInfo'}
        onClose={() => setOpenModal(null)}
        title={externalDeviceCategory === 'firewalls' ? 'Firewalls' : 'External Info (Firewalls/VPN)'}
      >
        <DataTable
          data={visibleExternalInfo}
          columns={[
            { key: 'SubName', label: 'Location', sortable: true },
            { key: 'Connection Type', label: 'Connection Type', sortable: true },
            { key: 'Device Type', label: 'Device Type', sortable: true },
            { key: 'IntIP', label: 'Int IP Address', type: 'ip', sortable: true },
            { key: 'IP address', label: 'Ext IP Address', type: 'ip', sortable: true },
            { key: 'Port', label: 'Port', type: 'number', sortable: true },
            { key: 'Username', label: 'Username', sortable: true },
            { key: 'Password', label: 'Password', type: 'password', sortable: false },
            { key: 'VPN Port', label: 'VPN Port', type: 'number', sortable: true },
            { key: 'VPN Username', label: 'VPN Username', sortable: true },
            { key: 'VPN Password', label: 'VPN Password', type: 'password', sortable: false },
            { key: 'VPN Domain', label: 'VPN Domain', sortable: true },
            { key: 'Current Version', label: 'Firmware Version', sortable: true },
            { key: 'Grouping', label: 'Grouping', sortable: true },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="externalInfo"
          defaultSort={getSortConfig('externalInfo')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={handleExternalInfoEdit}
          onToggleActive={(row, active) => handleCellEdit('externalInfo', row, 'Active', active ? 1 : 0, ['Client', 'SubName', 'Device Type'])}
          onAdd={() => setAddModalType('externalInfo')}
          onInactivate={(row) => handleInactivate('externalInfo', row, ['Client', 'SubName', 'Device Type'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'adminCredentials'}
        onClose={() => setOpenModal(null)}
        title="Admin Credentials"
      >
        <div className="flex flex-col gap-6 h-full">
          {/* Admin Emails */}
          <div className="flex-1 flex flex-col border-2 border-yellow-300 dark:border-yellow-700 rounded-lg overflow-hidden">
            <div className="bg-yellow-100 dark:bg-yellow-900/50 px-4 py-3 font-semibold text-base text-yellow-800 dark:text-yellow-300">
              Admin Emails ({adminCredentials.adminEmails.length})
            </div>
            <div className="flex-1 overflow-hidden p-4">
              <DataTable
                data={adminCredentials.adminEmails}
                columns={[
                  { key: 'Name', label: 'Name', sortable: true },
                  { key: 'Email', label: 'Email', type: 'email', sortable: true },
                  { key: 'Password', label: 'Password', type: 'password', sortable: false },
                ]}
                onAdd={() => setAddModalType('adminEmails')}
                hidePagination
                onInactivate={(row) => handleInactivate('adminEmails', row, ['Client', 'Email'])}
                editable={true}
                onCellEdit={(row, columnKey, newValue) => handleCellEdit('adminEmails', row, columnKey, newValue, ['Client', 'Email'])}
              />
            </div>
          </div>

          {/* Row with VOIP, Acronis, Cloudflare */}
          <div className="flex-1 grid grid-cols-3 gap-4">
            {/* VOIP */}
            <div className="flex flex-col border-2 border-blue-300 dark:border-blue-700 rounded-lg overflow-hidden">
              <div className="bg-blue-100 dark:bg-blue-900/50 px-4 py-3 font-semibold text-sm text-blue-800 dark:text-blue-300">
                VOIP Logins ({adminCredentials.voipLogins.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.voipLogins}
                  columns={[
                    { key: 'Provider', label: 'VOIP Provider', sortable: true },
                    { key: 'Login', label: 'Login', sortable: true },
                    { key: 'Password', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('adminVoipLogins')}
                  hidePagination
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('adminVoipLogins', row, ['Client', 'Provider', 'Login'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('adminVoipLogins', row, columnKey, newValue, ['Client', 'Provider', 'Login'])}
                />
              </div>
            </div>

            {/* Acronis */}
            <div className="flex flex-col border-2 border-green-300 dark:border-green-700 rounded-lg overflow-hidden">
              <div
                className="bg-green-100 dark:bg-green-900/50 px-4 py-3 font-semibold text-sm text-green-800 dark:text-green-300 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/70 transition-colors"
                onClick={() => setOpenModal('acronisDetail')}
                title="Click to view full Acronis backup details"
              >
                Acronis Backups ({adminCredentials.acronisBackups.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.acronisBackups}
                  columns={[
                    { key: 'UserName', label: 'Username', sortable: true },
                    { key: 'PW', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('acronisBackups')}
                  hidePagination
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('acronisBackups', row, ['Client', 'UserName'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('acronisBackups', row, columnKey, newValue, ['Client', 'UserName'])}
                />
              </div>
            </div>

            {/* Cloudflare */}
            <div className="flex flex-col border-2 border-red-300 dark:border-red-700 rounded-lg overflow-hidden">
              <div className="bg-red-100 dark:bg-red-900/50 px-4 py-3 font-semibold text-sm text-red-800 dark:text-red-300">
                Cloudflare ({adminCredentials.cloudflareAdmins.length})
              </div>
              <div className="flex-1 overflow-hidden p-3">
                <DataTable
                  data={adminCredentials.cloudflareAdmins}
                  columns={[
                    { key: 'username', label: 'Username', sortable: true },
                    { key: 'pass', label: 'Password', type: 'password', sortable: false },
                  ]}
                  onAdd={() => setAddModalType('cloudflareAdmins')}
                  hidePagination
                  enableExport={false}
                  onInactivate={(row) => handleInactivate('cloudflareAdmins', row, ['Client', 'username'])}
                  editable={true}
                  onCellEdit={(row, columnKey, newValue) => handleCellEdit('cloudflareAdmins', row, columnKey, newValue, ['Client', 'username'])}
                />
              </div>
            </div>
          </div>
        </div>
      </FullPageModal>

      {/* Navigation Button Modals */}
      <FullPageModal
        isOpen={openModal === 'systemsServices'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.systemsServices.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.systemsServices}
          data={systemsServices}
          onSortChange={handleSortChange}
          onNoteChange={handleDerivedNoteChange}
          onToggleActive={handleDerivedActiveChange}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'misc'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.misc.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.misc}
          data={miscData}
          editable={true}
          enableRowNotes={false}
          enableActivityToggle={false}
          onCellEdit={(row, columnKey, newValue) => handleMiscCellEdit(row, columnKey, newValue)}
          onAdd={() => setAddModalType('misc')}
          onInactivate={(row) => handleMiscDeleteRow(row)}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'devices'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.devices.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.devices}
          data={devices}
          defaultSort={getSortConfig('devices')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('devices', row, columnKey, newValue, ['client', 'Name'])}
          onAdd={() => setAddModalType('devices')}
          onInactivate={(row) => handleInactivate('devices', row, ['client', 'Name'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'camerasModal'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.camerasModal.title}
      >
          <CategoryTableView
            definition={CATEGORY_TABLE_DEFINITIONS.camerasModal}
            data={cameras}
            onSortChange={handleSortChange}
            editable={true}
            onCellEdit={(row, columnKey, newValue) => handleCellEdit('cameras', row, columnKey, newValue, ['Client', 'Name'])}
            onInactivate={(row) => handleInactivate('cameras', row, ['Client', 'Name'])}
          />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'vms'}
        onClose={() => setOpenModal(null)}
        title="Virtualization"
      >
        <CategoryPanel
          description="Virtual machines, containers, and background services grouped by their host systems."
          itemCount={vms.length + containers.length + daemons.length}
          itemLabel="records"
        >
        <HostGroupedView
          vms={vms}
          containers={containers}
          daemons={daemons}
          coreInfra={coreInfra}
          onAdd={() => setAddModalType('vms')}
        />
        </CategoryPanel>
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'acronisDetail'}
        onClose={() => setOpenModal(null)}
        title="Acronis Backup Details"
      >
        <DataTable
          data={adminCredentials.acronisBackups}
          columns={[
            { key: 'Acronis Cyber Cloud ', label: 'Acronis Cyber Cloud', sortable: true },
            { key: 'UserName', label: 'Username', sortable: true },
            { key: 'PW', label: 'Password', type: 'password', sortable: false },
            { key: 'Encrypt PW', label: 'Encrypt PW', type: 'password', sortable: false },
            { key: 'Encrypt PW2', label: 'Encrypt PW2', type: 'password', sortable: false },
            { key: 'Encrypt PW3', label: 'Encrypt PW3', type: 'password', sortable: false },
            { key: 'Encrypt PW4', label: 'Encrypt PW4', type: 'password', sortable: false },
            { key: 'Encrypt PW 5', label: 'Encrypt PW 5', type: 'password', sortable: false },
            { key: 'Encrypt PW 6', label: 'Encrypt PW 6', type: 'password', sortable: false },
            { key: 'Encrypt PW 7', label: 'Encrypt PW 7', type: 'password', sortable: false },
          ]}
          enablePasswordMasking={true}
          enableSearch={true}
          enableExport={true}
          tableId="acronisDetail"
          defaultSort={getSortConfig('acronisDetail')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('acronisBackups', row, columnKey, newValue, ['Client', 'UserName'])}
          onInactivate={(row) => handleInactivate('acronisBackups', row, ['Client', 'UserName'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'emails'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.emails.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.emails}
          data={emails}
          defaultSort={getSortConfig('emails')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('emails', row, columnKey, newValue, ['Client', 'Email'])}
          onAdd={() => setAddModalType('emails')}
          onInactivate={(row) => handleInactivate('emails', row, ['Client', 'Email'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'servicesModal'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.servicesModal.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.servicesModal}
          data={applicationsProviders}
          defaultSort={getSortConfig('servicesModal')}
          onSortChange={handleSortChange}
          onNoteChange={handleDerivedNoteChange}
          onToggleActive={handleDerivedActiveChange}
          onAdd={() => setAddModalType('services')}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'websitesModal'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.websitesModal.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.websitesModal}
          data={websites}
          defaultSort={getSortConfig('websitesModal')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('websites', row, columnKey, newValue, ['Client', 'DNS Host', 'URL'])}
          onToggleActive={(row, active) => handleCellEdit('websites', row, 'Is Inactive', active ? 0 : 1, ['Client', 'DNS Host', 'URL'])}
          onAdd={() => setAddModalType('websites')}
          onInactivate={(row) => handleInactivate('websites', row, ['Client', 'DNS Host', 'URL'], 'Is Inactive')}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'userDirectory'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.userDirectory.title}
      >
        <CategoryTableView definition={CATEGORY_TABLE_DEFINITIONS.userDirectory} data={allUserRecords} onSortChange={handleSortChange} onNoteChange={handleDerivedNoteChange} onToggleActive={handleDerivedActiveChange} />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'accountsAccess'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.accountsAccess.title}
      >
        <CategoryTableView definition={CATEGORY_TABLE_DEFINITIONS.accountsAccess} data={accessAccounts} onSortChange={handleSortChange} onNoteChange={handleDerivedNoteChange} onToggleActive={handleDerivedActiveChange} />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'usersModal'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.usersModal.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.usersModal}
          data={userDirectory}
          defaultSort={getSortConfig('usersModal')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('users', row, columnKey, newValue, ['Client', 'Login'])}
          onAdd={() => setAddModalType('users')}
          onInactivate={(row) => handleInactivate('users', row, ['Client', 'Login'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'allDevices'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.allDevices.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.allDevices}
          data={allDevices}
          enablePasswordMasking={false}
          onSortChange={handleSortChange}
          onNoteChange={handleDerivedNoteChange}
          onToggleActive={handleDerivedActiveChange}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'networkDevices'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.networkDevices.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.networkDevices}
          data={networkDevices}
          onSortChange={handleSortChange}
          onNoteChange={handleDerivedNoteChange}
          onToggleActive={handleDerivedActiveChange}
          onInactivate={(row) => row._source === 'core'
            ? handleInactivate('core', row._original, ['Client', 'Name', 'IP address'])
            : handleInactivate('externalInfo', row._original, ['Client', 'SubName', 'Device Type'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'domainAD'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.domainAD.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.domainAD}
          data={serverDirectoryRows}
          summary={typedDomains.length > 0 ? (
            <div className="cdms-category-summary-grid">
              <div><span>Local network domain</span><strong>{localDomainName || 'No local domain'}</strong></div>
              <div><span>Directory administrator</span><strong>{directoryAdminLogin || 'N/A'}</strong></div>
              <div><span>Web domain</span><strong>{webDomains.map(domain => domain['Domain Name']).filter(Boolean).join(', ') || 'No web domain'}</strong></div>
              {webDomains.some(domain => domain['Alt Domain']) && (
                <div><span>Alternate web domain</span><strong>{webDomains.map(domain => domain['Alt Domain']).filter(Boolean).join(', ')}</strong></div>
              )}
            </div>
          ) : undefined}
          defaultSort={getSortConfig('domainAD')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) => handleCellEdit('core', row, columnKey, newValue, ['Client', 'Name', 'IP address'])}
          onAdd={() => setAddModalType('core')}
          onInactivate={(row) => handleInactivate('core', row, ['Client', 'Name'])}
        />
      </FullPageModal>

      <FullPageModal
        isOpen={openModal === 'workstationsRaw'}
        onClose={() => setOpenModal(null)}
        title={CATEGORY_TABLE_DEFINITIONS.workstationsRaw.title}
      >
        <CategoryTableView
          definition={CATEGORY_TABLE_DEFINITIONS.workstationsRaw}
          data={workstations}
          enablePasswordMasking={false}
          tableId="workstations"
          defaultSort={getSortConfig('workstations')}
          onSortChange={handleSortChange}
          editable={true}
          onCellEdit={(row, columnKey, newValue) =>
            handleCellEdit('workstations', row, columnKey, newValue, ['Client', 'Computer Name'])
          }
          onAdd={() => setAddModalType('workstations')}
          onInactivate={(row) => handleInactivate('workstations', row, ['Client', 'Computer Name'])}
          expandable={true}
          expandedRowRenderer={(row) => (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Users on {row["Computer Name"]} ({row._userCount || 0})
              </h4>
              {row._users && row._users.length > 0 ? (
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Name</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Login</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Phone</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Cell</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row._users.map((user: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.login}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.phone}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.cell}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.subName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-400 dark:text-gray-500 italic text-sm">No users assigned to this workstation</p>
              )}
            </div>
          )}
        />
      </FullPageModal>

      {/* Reports Modal */}
      <FullPageModal
        isOpen={openModal === 'reports'}
        onClose={() => setOpenModal(null)}
        title="Reports"
      >
        <CategoryPanel description="Operational, security, lifecycle, and readiness reports for the selected client.">
          {/* Report Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap border-b border-gray-200 dark:border-gray-700 pb-3">
            {[
              { id: 'inactive', label: 'Inactive Assets', icon: '🔴' },
              { id: 'missingData', label: 'Missing Data', icon: '⚠️' },
              { id: 'mfaStatus', label: 'MFA Status', icon: '🔐' },
              { id: 'firmware', label: 'Firmware Versions', icon: '📦' },
              { id: 'resources', label: 'Host Resources', icon: '💾' },
              { id: 'passwordAge', label: 'Password Age', icon: '🔑' },
              { id: 'win11', label: 'Windows 11 Ready', icon: '💻' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReportsTab(tab.id as typeof reportsTab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  reportsTab === tab.id
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Report Content */}
          <div className="flex-1 overflow-auto">
            {/* Inactive Assets Report */}
            {reportsTab === 'inactive' && (
              <div className="space-y-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">Inactive Assets Summary</h3>
                  <p className="text-sm text-red-600 dark:text-red-400">Items marked as inactive across the infrastructure.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive VMs ({vms.filter(v => v.Active === 0 || v.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {vms.filter(v => v.Active === 0 || v.Active === '0').map((vm, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{vm.Name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({vm.Host})</span>
                        </div>
                      ))}
                      {vms.filter(v => v.Active === 0 || v.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Users ({users.filter(u => u.Active === 0 || u.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {users.filter(u => u.Active === 0 || u.Active === '0').map((user, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{user.Name}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs ml-2">({user.Login})</span>
                        </div>
                      ))}
                      {users.filter(u => u.Active === 0 || u.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Emails ({emails.filter(e => e.Active === 0 || e.Active === '0').length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {emails.filter(e => e.Active === 0 || e.Active === '0').map((email, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0">
                          <span className="text-gray-900 dark:text-gray-100">{email.Email}</span>
                        </div>
                      ))}
                      {emails.filter(e => e.Active === 0 || e.Active === '0').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Inactive Daemons ({daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').length})</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    {daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').map((daemon, i) => (
                      <div key={i} className="py-1 px-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-gray-900 dark:text-gray-100">{daemon.Name}</span>
                      </div>
                    ))}
                    {daemons.filter(d => d.Inactive === 1 || d.Inactive === '1').length === 0 && (
                      <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Missing Data Report */}
            {reportsTab === 'missingData' && (
              <div className="space-y-6">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Missing Data Report</h3>
                  <p className="text-sm text-amber-600 dark:text-amber-400">Items missing critical information that should be filled in.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Servers Missing IP ({coreInfra.filter(c => !c['IP address']).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {coreInfra.filter(c => !c['IP address']).map((item, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {item.Name || 'Unnamed'}
                        </div>
                      ))}
                      {coreInfra.filter(c => !c['IP address']).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All servers have IP addresses</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Servers Missing Passwords ({coreInfra.filter(c => !c.Password).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {coreInfra.filter(c => !c.Password).map((item, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {item.Name || 'Unnamed'} <span className="text-gray-400">({item['IP address'] || 'No IP'})</span>
                        </div>
                      ))}
                      {coreInfra.filter(c => !c.Password).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All servers have passwords</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">VMs Missing IP ({vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).map((vm, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {vm.Name} <span className="text-gray-400">({vm.Host})</span>
                        </div>
                      ))}
                      {vms.filter(v => !v.IP && (v.Active === 1 || v.Active === '1' || v.Active === undefined)).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All active VMs have IP addresses</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Services Missing Passwords ({services.filter(s => !s.Password).length})</h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {services.filter(s => !s.Password).map((svc, i) => (
                        <div key={i} className="py-1 border-b border-gray-100 dark:border-gray-700 last:border-0 text-gray-900 dark:text-gray-100">
                          {svc.Service}
                        </div>
                      ))}
                      {services.filter(s => !s.Password).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All services have passwords</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* MFA Status Report */}
            {reportsTab === 'mfaStatus' && (
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">MFA Status Report</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">Email accounts grouped by MFA enrollment status.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                      ✓ MFA Enabled ({emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).length})
                    </h4>
                    <div className="max-h-64 overflow-auto text-sm">
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).map((email, i) => (
                        <div key={i} className="py-1 border-b border-green-100 dark:border-green-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {email.Email}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      ✗ MFA Not Enabled ({emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).length})
                    </h4>
                    <div className="max-h-64 overflow-auto text-sm">
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).map((email, i) => (
                        <div key={i} className="py-1 border-b border-red-100 dark:border-red-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {email.Email}
                        </div>
                      ))}
                      {emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 0 || e['MFA or Ignore'] === '0' || !e['MFA or Ignore'])).length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All active accounts have MFA</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {emails.length > 0 ? Math.round((emails.filter(e => (e.Active === 1 || e.Active === '1' || e.Active === undefined) && (e['MFA or Ignore'] === 1 || e['MFA or Ignore'] === '1')).length / emails.filter(e => e.Active === 1 || e.Active === '1' || e.Active === undefined).length) * 100) : 0}%
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">of active email accounts have MFA enabled</div>
                  </div>
                </div>
              </div>
            )}

            {/* Firmware Versions Report */}
            {reportsTab === 'firmware' && (
              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-300 mb-2">Firmware Versions Report</h3>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">Firewall and router firmware versions for update planning.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Location</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Device Type</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">IP Address</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Firmware Version</th>
                      </tr>
                    </thead>
                    <tbody>
                      {externalInfo.filter(e => e['Current Version']).map((item, i) => (
                        <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item.SubName || '-'}</td>
                          <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{item['Device Type'] || '-'}</td>
                          <td className="px-4 py-2 font-mono text-gray-900 dark:text-gray-100">{item['IP address'] || '-'}</td>
                          <td className="px-4 py-2">
                            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-xs font-mono">
                              {item['Current Version']}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {externalInfo.filter(e => e['Current Version']).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                            No firmware version data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">Devices Without Version Info ({externalInfo.filter(e => !e['Current Version']).length})</h4>
                  <div className="flex flex-wrap gap-2 text-sm">
                    {externalInfo.filter(e => !e['Current Version']).map((item, i) => (
                      <span key={i} className="px-2 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded">
                        {item['Device Type']} @ {item.SubName}
                      </span>
                    ))}
                    {externalInfo.filter(e => !e['Current Version']).length === 0 && (
                      <p className="text-green-600 dark:text-green-400">✓ All devices have firmware versions recorded</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Host Resources Report */}
            {reportsTab === 'resources' && (
              <div className="space-y-6">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-emerald-800 dark:text-emerald-300 mb-2">Host Resource Allocation</h3>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">CPU and RAM allocation across hypervisor hosts.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    // Group VMs by host and calculate resources
                    const hostResources: Record<string, { vms: number; cores: number; ram: number; hostCores?: number; hostRam?: number }> = {};
                    vms.filter(v => v.Active === 1 || v.Active === '1' || v.Active === undefined).forEach(vm => {
                      const host = vm.Host || 'Unknown';
                      if (!hostResources[host]) {
                        const hostInfo = coreInfra.find(c => c.Name === host);
                        hostResources[host] = {
                          vms: 0,
                          cores: 0,
                          ram: 0,
                          hostCores: hostInfo?.Cores,
                          hostRam: hostInfo?.['Ram (GB)']
                        };
                      }
                      hostResources[host].vms++;
                      hostResources[host].cores += parseInt(String(vm['Assigned cores'] || 0), 10);
                      hostResources[host].ram += vm['Startup memory (GB)'] || 0;
                    });
                    return Object.entries(hostResources).map(([host, data]) => (
                      <div key={host} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">{host}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">VMs:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">{data.vms}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Allocated Cores:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {data.cores}{data.hostCores ? ` / ${data.hostCores}` : ''}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Allocated RAM:</span>
                            <span className="text-gray-900 dark:text-gray-100 font-medium">
                              {data.ram} GB{data.hostRam ? ` / ${data.hostRam} GB` : ''}
                            </span>
                          </div>
                          {data.hostCores && (
                            <div className="mt-2 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${data.cores / data.hostCores > 0.9 ? 'bg-red-500' : data.cores / data.hostCores > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, (data.cores / data.hostCores) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                  {vms.length === 0 && (
                    <p className="text-gray-400 dark:text-gray-500 italic col-span-full text-center py-8">No VM data available</p>
                  )}
                </div>
              </div>
            )}

            {/* Password Age Report */}
            {reportsTab === 'passwordAge' && (
              <div className="space-y-6">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-2">Password Age Report</h3>
                  <p className="text-sm text-orange-600 dark:text-orange-400">Services with tracked password change dates.</p>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Service</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Username</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Last Changed</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700 dark:text-gray-300">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter(s => s['Date of last known change']).map((svc, i) => {
                        const lastChanged = new Date(svc['Date of last known change']);
                        const today = new Date();
                        const diffDays = Math.floor((today.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{svc.Service}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{svc.Username || '-'}</td>
                            <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                              {lastChanged.toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                diffDays > 365 ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                                diffDays > 180 ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300' :
                                'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                              }`}>
                                {diffDays} days
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {services.filter(s => s['Date of last known change']).length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                            No password change dates recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Windows 11 Ready Report */}
            {reportsTab === 'win11' && (
              <div className="space-y-6">
                <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-cyan-800 dark:text-cyan-300 mb-2">Windows 11 Readiness Report</h3>
                  <p className="text-sm text-cyan-600 dark:text-cyan-400">Workstations and VMs grouped by Windows 11 compatibility.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
                      ✓ Windows 11 Capable ({workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').length} workstations)
                    </h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').map((ws, i) => (
                        <div key={i} className="py-1 border-b border-green-100 dark:border-green-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {ws.computerName} <span className="text-gray-400">({ws.cpu || 'Unknown CPU'})</span>
                        </div>
                      ))}
                      {workstationsUsers.filter(w => w.win11Capable === 1 || w.win11Capable === '1').length === 0 && (
                        <p className="text-gray-400 dark:text-gray-500 italic">No data</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      ✗ Not Windows 11 Capable ({workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').length} workstations)
                    </h4>
                    <div className="max-h-48 overflow-auto text-sm">
                      {workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').map((ws, i) => (
                        <div key={i} className="py-1 border-b border-red-100 dark:border-red-800 last:border-0 text-gray-900 dark:text-gray-100">
                          {ws.computerName} <span className="text-gray-400">({ws.cpu || 'Unknown CPU'})</span>
                        </div>
                      ))}
                      {workstationsUsers.filter(w => w.win11Capable === 0 || w.win11Capable === '0').length === 0 && (
                        <p className="text-green-600 dark:text-green-400">✓ All workstations are Win11 capable</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-700 dark:text-amber-300 mb-2">
                    VMs with Windows 11 Issues ({vms.filter(v => v['Windows 11 Issue?']).length})
                  </h4>
                  <div className="max-h-32 overflow-auto text-sm">
                    {vms.filter(v => v['Windows 11 Issue?']).map((vm, i) => (
                      <div key={i} className="py-1 border-b border-amber-100 dark:border-amber-800 last:border-0">
                        <span className="text-gray-900 dark:text-gray-100">{vm.Name}</span>
                        <span className="text-amber-600 dark:text-amber-400 text-xs ml-2">Issue: {vm['Windows 11 Issue?']}</span>
                      </div>
                    ))}
                    {vms.filter(v => v['Windows 11 Issue?']).length === 0 && (
                      <p className="text-green-600 dark:text-green-400">✓ No Windows 11 issues flagged for VMs</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CategoryPanel>
      </FullPageModal>

      {/* Client Company Modals */}
      <AddRecordModal
        isOpen={companyModalMode === 'add'}
        onClose={() => setCompanyModalMode(null)}
        title="Add Client Company"
        fields={[
          { key: 'Company Name', label: 'Company Name', required: true },
          { key: 'Abbrv', label: 'Abbreviation', required: true },
          { key: 'Group', label: 'Group' },
          { key: 'Main Phones', label: 'Main Phones', type: 'phone-list', defaultValue: [{ Name: '', Number: '' }] },
          { key: 'Status', label: 'Status', type: 'select', options: ['0', '1', '2'], defaultValue: '0' },
        ]}
        onSave={(data) => handleCompanySave('add', data)}
      />

      <AddRecordModal
        isOpen={companyModalMode === 'selectForUpdate'}
        onClose={() => setCompanyModalMode(prev => prev === 'selectForUpdate' ? null : prev)}
        title="Select Company to Update"
        fields={[
          { key: 'companyLabel', label: 'Company', required: true, type: 'select', options: clients.map(client => client.label) },
        ]}
        onSave={(data) => handleSelectCompanyForUpdate(data)}
      />

      <AddRecordModal
        isOpen={companyModalMode === 'update'}
        onClose={() => {
          setCompanyModalMode(null);
          setCompanyEditTarget(null);
          setCompanyEditData(null);
        }}
        title="Update Client Company"
        fields={[
          { key: 'Abbrv', label: 'Abbreviation', autoFill: true, defaultValue: companyEditTarget || '' },
          { key: 'Company Name', label: 'Company Name', required: true, defaultValue: companyEditData?.['Company Name'] || '' },
          { key: 'Group', label: 'Group', defaultValue: companyEditData?.Group || '' },
          { key: 'Main Phones', label: 'Main Phones', type: 'phone-list', defaultValue: companyEditData?.['Main Phones']?.length ? companyEditData['Main Phones'] : [{ Name: '', Number: '' }] },
          { key: 'Status', label: 'Status', type: 'select', options: ['0', '1', '2'], defaultValue: String(companyEditData?.Status ?? '0') },
        ]}
        onSave={(data) => handleCompanySave('update', data)}
      />

      {/* Add Record Modals */}
      <AddRecordModal
        isOpen={addModalType === 'externalInfo'}
        onClose={() => setAddModalType(null)}
        title="Add Firewall/Router"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'SubName', label: 'Location', required: true },
          { key: 'Device Type', label: 'Device Type', required: true },
          { key: 'Connection Type', label: 'Connection Type' },
          { key: 'IP address', label: 'External IP', type: 'ip' },
          { key: 'Port', label: 'Port', type: 'number' },
          { key: 'Username', label: 'Username' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'VPN Port', label: 'VPN Port', type: 'number' },
          { key: 'VPN Username', label: 'VPN Username' },
          { key: 'VPN Password', label: 'VPN Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
        ]}
        onSave={(data) => handleAddRecord('externalInfo', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'core'}
        onClose={() => setAddModalType(null)}
        title="Add Server/Switch"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'SubName', label: 'Location' },
          { key: 'IP address', label: 'IP Address', type: 'ip' },
          { key: 'Machine Name / MAC', label: 'Machine Name/MAC' },
          { key: 'Service Tag', label: 'Service Tag' },
          { key: 'Description', label: 'Description' },
          { key: 'Login', label: 'Login' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
          { key: 'Cores', label: 'Cores', type: 'number' },
          { key: 'Ram (GB)', label: 'RAM (GB)', type: 'number' },
          { key: 'On Landing Page', label: 'Landing Page', type: 'checkbox' },
          { key: 'RDP?', label: 'RDP', type: 'checkbox' },
          { key: 'VNC?', label: 'VNC', type: 'checkbox' },
          { key: 'SSH?', label: 'SSH', type: 'checkbox' },
          { key: 'Web?', label: 'Web', type: 'checkbox' },
          { key: 'AD Server', label: 'AD Server', type: 'checkbox' },
        ]}
        onSave={(data) => handleAddRecord('core', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'websites'}
        onClose={() => setAddModalType(null)}
        title="Add Website / DNS Record"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Registrar', label: 'Registrar' },
          { key: 'Registrar Credential Location', label: 'Registrar Credential Location', type: 'select', options: ['Local', 'Password Manager', 'Client'] },
          { key: 'Registrar Username', label: 'Registrar Username', visibleWhen: { key: 'Registrar Credential Location', value: 'Local' } },
          { key: 'Registrar Password', label: 'Registrar Password', type: 'password', visibleWhen: { key: 'Registrar Credential Location', value: 'Local' } },
          { key: 'DNS Host', label: 'DNS Host' },
          { key: 'DNS Server Credential Location', label: 'DNS Credential Location', type: 'select', options: ['Local', 'Password Manager', 'Client'] },
          { key: 'DNS Username', label: 'DNS Username', visibleWhen: { key: 'DNS Server Credential Location', value: 'Local' } },
          { key: 'DNS Password', label: 'DNS Password', type: 'password', visibleWhen: { key: 'DNS Server Credential Location', value: 'Local' } },
          { key: 'Website Host', label: 'Website Host' },
          { key: 'Website Credential Location', label: 'Website Credential Location', type: 'select', options: ['Local', 'Password Manager', 'Client'] },
          { key: 'Website Username', label: 'Website Username', visibleWhen: { key: 'Website Credential Location', value: 'Local' } },
          { key: 'Website Password', label: 'Website Password', type: 'password', visibleWhen: { key: 'Website Credential Location', value: 'Local' } },
          { key: 'URL', label: 'URL', type: 'url' },
          { key: 'Notes', label: 'Notes' },
        ]}
        onSave={(data) => handleAddRecord('websites', data)}
        actionButton={{
          label: "Autopopulate",
          disabled: !whoisAvailable,
          disabledReason: "Requires whois.exe (winget install Microsoft.Sysinternals.Whois)",
          onClick: handleWhoisLookup,
        }}
      />

      <AddRecordModal
        isOpen={addModalType === 'adminEmails'}
        onClose={() => setAddModalType(null)}
        title="Add Admin Email"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'Email', label: 'Email', type: 'email', required: true },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Notes', label: 'Notes' },
        ]}
        onSave={(data) => handleAddRecord('adminEmails', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'adminVoipLogins'}
        onClose={() => setAddModalType(null)}
        title="Add VOIP Login"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Provider', label: 'VOIP Provider', required: true },
          { key: 'Login', label: 'Login', required: true },
          { key: 'Password', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('adminVoipLogins', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'acronisBackups'}
        onClose={() => setAddModalType(null)}
        title="Add Acronis Backup"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'UserName', label: 'Username', required: true },
          { key: 'PW', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('acronisBackups', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'cloudflareAdmins'}
        onClose={() => setAddModalType(null)}
        title="Add Cloudflare Admin"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'username', label: 'Username', required: true },
          { key: 'pass', label: 'Password', type: 'password', required: true },
        ]}
        onSave={(data) => handleAddRecord('cloudflareAdmins', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'services'}
        onClose={() => setAddModalType(null)}
        title="Add Service"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Service', label: 'Service', required: true },
          { key: 'Username', label: 'Username' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Host / URL', label: 'Host/URL' },
          { key: 'Date of last known change', label: 'Date of Last Known Change' },
          { key: 'Notes', label: 'Notes', type: 'textarea' },
        ]}
        onSave={(data) => handleAddRecord('services', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'users'}
        onClose={() => setAddModalType(null)}
        title="Add User"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'Login', label: 'Login', required: true },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Computer Name', label: 'Computer Name' },
          { key: 'SubName', label: 'Location' },
          { key: 'Phone', label: 'Phone' },
          { key: 'Cell', label: 'Cell' },
          { key: 'Notes', label: 'Notes', type: 'textarea' },
          { key: 'Notes 2', label: 'Notes 2', type: 'textarea' },
          { key: 'Epicor Number', label: 'Epicor #' },
          { key: 'Active', label: 'Active', type: 'checkbox', defaultValue: 1 },
          { key: 'Grouping', label: 'Grouping' },
        ]}
        onSave={(data) => handleAddRecord('users', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'workstations'}
        onClose={() => setAddModalType(null)}
        title="Add Workstation"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Computer Name', label: 'Computer Name', required: true },
          { key: 'IP Address', label: 'IP Address' },
          { key: 'Service Tag', label: 'Service Tag' },
          { key: 'CPU', label: 'CPU' },
          { key: 'Description', label: 'Description' },
          { key: 'Upstream', label: 'Upstream' },
          { key: 'Notes', label: 'Notes', type: 'textarea' },
          { key: 'Notes 2', label: 'Notes 2', type: 'textarea' },
          { key: 'Active', label: 'Active', type: 'checkbox', defaultValue: 1 },
          { key: 'Grouping', label: 'Grouping' },
          { key: 'Asset ID', label: 'Asset ID' },
          { key: 'Win11 Capable', label: 'Win11 Capable', type: 'checkbox', defaultValue: 0 },
        ]}
        onSave={(data) => handleAddRecord('workstations', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'vms'}
        onClose={() => setAddModalType(null)}
        title="Add Virtual Machine"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'Location', label: 'Location' },
          { key: 'IP', label: 'IP Address' },
          { key: 'Type', label: 'Type' },
          { key: 'Host', label: 'Host' },
          { key: 'Startup memory (GB)', label: 'Startup Memory (GB)' },
          { key: 'Assigned cores', label: 'Assigned Cores' },
          { key: 'Assigned To', label: 'Assigned To' },
          { key: 'Notes', label: 'Notes', type: 'textarea' },
          { key: 'Grouping', label: 'Grouping' },
          { key: 'Active', label: 'Active', type: 'checkbox', defaultValue: 1 },
          { key: 'Startup Notes', label: 'Startup Notes', type: 'textarea' },
        ]}
        onSave={(data) => handleAddRecord('vms', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'devices'}
        onClose={() => setAddModalType(null)}
        title="Add Device"
        fields={[
          { key: 'client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Name', label: 'Name', required: true },
          { key: 'Device Type', label: 'Device Type', required: true },
          { key: 'IP address', label: 'IP Address' },
          { key: 'Machine Name / MAC', label: 'Machine Name/MAC' },
          { key: 'Service Tag', label: 'Service Tag' },
          { key: 'Login', label: 'Login' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Note', label: 'Note' },
          { key: 'Note 1', label: 'Note 1' },
          { key: 'Note 2', label: 'Note 2' },
          { key: 'Note 3', label: 'Note 3' },
          { key: 'Grouping', label: 'Grouping' },
          { key: 'Asset ID', label: 'Asset ID' },
        ]}
        onSave={(data) => handleAddRecord('devices', data)}
      />

      <AddRecordModal
        isOpen={addModalType === 'emails'}
        onClose={() => setAddModalType(null)}
        title="Add Email Account"
        fields={[
          { key: 'Client', label: 'Client', autoFill: true, defaultValue: selectedClient },
          { key: 'Username', label: 'Username', required: true },
          { key: 'Email', label: 'Email', type: 'email', required: true },
          { key: 'Name', label: 'Name' },
          { key: 'Password', label: 'Password', type: 'password' },
          { key: 'Notes', label: 'Notes', type: 'textarea' },
          { key: 'Active', label: 'Active', type: 'checkbox', defaultValue: 1 },
          { key: 'MFA or Ignore', label: 'MFA Enabled', type: 'checkbox', defaultValue: 0 },
          { key: 'OWA_override', label: 'OWA Override', type: 'checkbox', defaultValue: 0 },
          { key: 'IMAP_override', label: 'IMAP Override', type: 'checkbox', defaultValue: 0 },
          { key: 'POP_override', label: 'POP Override', type: 'checkbox', defaultValue: 0 },
          { key: 'SMTP_override', label: 'SMTP Override', type: 'checkbox', defaultValue: 0 },
        ]}
        onSave={(data) => handleAddRecord('emails', data)}
      />
      <AddRecordModal
        isOpen={addModalType === 'misc'}
        onClose={() => setAddModalType(null)}
        title="Add Note"
        fields={[
          { key: 'Notes', label: 'Note', type: 'textarea', required: true },
        ]}
        onSave={(data) => handleMiscAddRow(data)}
      />
    </div>
  );
}
