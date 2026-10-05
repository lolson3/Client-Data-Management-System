"use client";

import { useEffect, useLayoutEffect, useState, useCallback, useMemo, useRef, type DragEvent, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import type { OverviewResizeDirection } from "@/components/OverviewPanel";
import { type Column, type SortConfig } from "@/components/DataTable";
import { CATEGORY_TABLE_DEFINITIONS, getOverviewColumns } from "@/config/categoryTableDefinitions";
import { V1Celebration } from "@/components/EasterEggs";
import { useTheme } from "@/hooks/useTheme";
import { PREFERENCE_KEYS } from "@/types/preferences";
import { overviewItemsOverlap, placeOverviewPanel, resizeOverviewLayout, type OverviewLayoutItem } from "@/lib/overviewLayout";
import {
  CLIENT_STORAGE_KEY,
  DEFAULT_OVERVIEW_LAYOUT,
  DEFAULT_SORTS,
  MAX_OVERVIEW_PANELS,
  MIN_OVERVIEW_COLUMNS,
  MIN_OVERVIEW_ROWS,
  OVERVIEW_COLUMNS,
  OVERVIEW_LAYOUT_STORAGE_KEY,
  OVERVIEW_ROWS,
  SORT_PREFS_STORAGE_KEY,
  type OverviewInteraction,
} from "@/components/dashboard/dashboardConfig";
import {
  flattenMiscNotes,
  isAffirmativeValue,
  noteSource,
  recordNoteFields,
} from "@/components/dashboard/recordTransforms";
import { DashboardRecordDialogs } from "@/components/dashboard/DashboardRecordDialogs";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardCategoryModals } from "@/components/dashboard/DashboardCategoryModals";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverviewWorkspace } from "@/components/dashboard/DashboardOverviewWorkspace";

interface WorkspaceSearchSource { section: string; modal: string; rows: any[]; }
interface WorkspaceRecordSearchResult {
  section: string;
  modal: string;
  record: string;
  matches: Array<{ field: string; value: string }>;
}

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
  const [overviewLayout, setOverviewLayout] = useState<OverviewLayoutItem[]>(DEFAULT_OVERVIEW_LAYOUT);
  const [overviewLayoutReady, setOverviewLayoutReady] = useState(false);
  const [overviewInteraction, setOverviewInteraction] = useState<OverviewInteraction | null>(null);
  const [maximizedOverviewPanel, setMaximizedOverviewPanel] = useState<string | null>(null);
  const [miscData, setMiscData] = useState<any[]>([]);

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
      Phone: user.Phone,
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

  // Handle inline cell edits through the migrated dataset API.
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
          apiId: row._apiId,
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
    const columnKey = Object.prototype.hasOwnProperty.call(source.row, 'Active')
      ? 'Active'
      : Object.prototype.hasOwnProperty.call(source.row, 'Is Inactive')
        ? 'Is Inactive'
        : 'Inactive';
    const value = columnKey === 'Active' ? (active ? 1 : 0) : (active ? 0 : 1);
    return handleCellEdit(source.fileKey, source.row, columnKey, value, source.identifierKeys);
  }, [handleCellEdit]);

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
        _apiId: phone._apiId,
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
          apiId: mode === 'update' ? companyEditData?._apiId : undefined,
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
          _apiId: phone._apiId,
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
            apiId: existingPhone._apiId,
            rowIdentifier: { Client: clientAbbreviation, Name: existingPhone.Name },
          }, `Failed to remove ${existingPhone.Name} phone number`);
        }
      }

      for (const phone of normalizedPhones) {
        const isUnchangedName = phone._originalName && phone._originalName === phone.Name;
        await savePhoneChange(isUnchangedName ? {
          action: 'updateRow',
          apiId: phone._apiId,
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
          apiId: row._apiId ?? row._wsApiId,
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
          apiId: row._apiId,
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
          apiId: row._apiId,
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
    data,
    columns: getOverviewColumns(id),
  });

  const overviewPanelCatalog: Record<string, { title: string; data: any[]; columns: Column[] }> = {
    externalNetwork: {
      title: 'Firewalls & Routers',
      data: networkDevices.filter(device => /firewall|router/i.test(String(device['Device Type'] || ''))),
      columns: getOverviewColumns('networkDevices'),
    },
    accountsAccess: categoryOverviewPanel('accountsAccess', accessAccounts),
    adminCredentials: {
      title: 'Admin Credentials',
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
      title: 'MFA Attention',
      data: emails.filter(email => isAffirmativeValue(email.Active) && !isAffirmativeValue(email['MFA or Ignore'])),
      columns: getOverviewColumns('emails'),
    },
    misc: categoryOverviewPanel('misc', miscData),
    allDevices: categoryOverviewPanel('allDevices', allDevices),
    workstationsRaw: categoryOverviewPanel('workstationsRaw', workstations),
    domainAD: categoryOverviewPanel('domainAD', serverDirectoryRows),
    domainControllers: {
      title: 'Domain Controllers',
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
      title: 'Service Providers',
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
      <DashboardHeader
        user={user}
        appVersion={appVersion}
        selectedClient={selectedClient}
        selectedClientRecord={selectedClientRecord}
        guacamoleUrl={guacamoleUrl}
        contactMenuRef={contactMenuRef}
        contactMenuOpen={contactMenuOpen}
        setContactMenuOpen={setContactMenuOpen}
        phoneNumbers={phoneNumbers}
        peopleContacts={peopleContacts}
        providerContacts={providerContacts}
        onOpenModal={setOpenModal}
        clientPickerRef={clientPickerRef}
        clientPickerOpen={clientPickerOpen}
        setClientPickerOpen={setClientPickerOpen}
        clientSearchInputRef={clientSearchInputRef}
        clientSearch={clientSearch}
        setClientSearch={setClientSearch}
        clientSearchDirty={clientSearchDirty}
        setClientSearchDirty={setClientSearchDirty}
        filteredClients={filteredClients}
        activeClientIndex={activeClientIndex}
        setActiveClientIndex={setActiveClientIndex}
        loading={loading}
        onClientChange={handleClientChange}
        onCompanyModalMode={setCompanyModalMode}
        onSelectCompanyForUpdate={handleSelectCompanyForUpdate}
        onRefresh={fetchClientData}
        loadingData={loadingData}
        userMenuOpen={userMenuOpen}
        setUserMenuOpen={setUserMenuOpen}
        theme={theme}
        setTheme={setTheme}
        onResetOverview={resetOverviewLayout}
        onLogout={handleLogout}
      />

      <div className="cdms-workspace flex-1 min-h-0 flex">
        <DashboardSidebar
          selectedClient={Boolean(selectedClient)}
          loadingData={loadingData}
          openModal={openModal}
          onOpenModal={setOpenModal}
          workspaceSearch={workspaceSearch}
          onWorkspaceSearchChange={setWorkspaceSearch}
          onWorkspaceSearchSubmit={() => {
            setSubmittedWorkspaceSearch(workspaceSearch.trim());
            setOpenModal('searchResults');
            setWorkspaceSearch('');
          }}
          workspaceSearchResults={workspaceSearchResults}
          overviewLayoutCount={overviewLayout.length}
          overviewPickerOpen={overviewPickerOpen}
          onOverviewPickerOpenChange={setOverviewPickerOpen}
          overviewPickerRef={overviewPickerRef}
          suppressClickUntilRef={suppressSidebarClickUntilRef}
          onBeginOverviewDrag={beginOverviewDrag}
        />

      <main className="cdms-main flex-1 overflow-hidden p-5 flex flex-col">
        <DashboardOverviewWorkspace
          hasSelectedClient={Boolean(selectedClient)}
          hasOpenCategory={Boolean(openModal)}
          loadingData={loadingData}
          overviewPickerOpen={overviewPickerOpen}
          overviewPickerMenuRef={overviewPickerMenuRef}
          overviewGridRef={overviewGridRef}
          overviewLayout={overviewLayout}
          overviewInteraction={overviewInteraction}
          maximizedOverviewPanel={maximizedOverviewPanel}
          panelCatalog={overviewPanelCatalog}
          onAddPanel={addOverviewPanel}
          onPreviewDrop={previewOverviewDrop}
          onDrop={handleOverviewDrop}
          onDragStart={beginOverviewDrag}
          onResizeStart={beginOverviewResize}
          onTogglePanelSize={toggleOverviewPanelSize}
          onUnpinPanel={(panelId) => {
            captureOverviewRects();
            if (maximizedOverviewPanel === panelId) setMaximizedOverviewPanel(null);
            setOverviewLayout(current => current.filter(item => item.id !== panelId));
          }}
        />
      </main>
      </div>

      <DashboardCategoryModals
        openModal={openModal}
        onOpenModal={setOpenModal}
        submittedWorkspaceSearch={submittedWorkspaceSearch}
        submittedWorkspaceSearchResults={submittedWorkspaceSearchResults}
        data={{
          accessAccounts,
          allDevices,
          allUserRecords,
          applicationsProviders,
          cameras,
          containers,
          coreInfra,
          daemons,
          devices,
          emails,
          externalInfo,
          miscData,
          networkDevices,
          serverDirectoryRows,
          services,
          systemsServices,
          typedDomains,
          userDirectory,
          users,
          vms,
          webDomains,
          websites,
          workstations,
          workstationsUsers,
        }}
        localDomainName={localDomainName}
        directoryAdminLogin={directoryAdminLogin}
        getSortConfig={getSortConfig}
        onSortChange={handleSortChange}
        onDerivedNoteChange={handleDerivedNoteChange}
        onDerivedActiveChange={handleDerivedActiveChange}
        onCellEdit={handleCellEdit}
        onArchive={handleInactivate}
        onMiscCellEdit={handleMiscCellEdit}
        onMiscDeleteRow={handleMiscDeleteRow}
        onAddRecord={setAddModalType}
      />
      <DashboardRecordDialogs
        addModalType={addModalType}
        closeAddModal={() => setAddModalType(null)}
        selectedClient={selectedClient}
        saveRecord={handleAddRecord}
        saveMiscNote={handleMiscAddRow}
        whoisAvailable={whoisAvailable}
        runWhoisLookup={handleWhoisLookup}
        companyModalMode={companyModalMode}
        setCompanyModalMode={setCompanyModalMode}
        clients={clients}
        companyEditTarget={companyEditTarget}
        companyEditData={companyEditData}
        clearCompanyEdit={() => {
          setCompanyEditTarget(null);
          setCompanyEditData(null);
        }}
        saveCompany={handleCompanySave}
        selectCompanyForUpdate={handleSelectCompanyForUpdate}
      />
    </div>
  );
}
