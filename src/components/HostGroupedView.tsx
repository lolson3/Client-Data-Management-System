"use client";

import { useState, useMemo } from "react";

interface VM {
  Name: string;
  Location: string;
  IP: string;
  Type: string;
  Host: string;
  "Startup memory (GB)": number;
  "Assigned cores": string;
  "Assigned To": string;
  Notes: string;
  Grouping: string;
  Active: number;
  "Startup Notes"?: string;
}

interface Container {
  Name: string;
  IP: string;
  Port: number;
  Grouping: string;
  Host?: string;
  "Startup Notes"?: string;
}

interface Daemon {
  Name: string;
  Location: string;
  IP: string;
  Host: string;
  User: string;
  Notes: string;
  Inactive: number;
  "Startup Notes"?: string;
}

interface CoreInfrastructure {
  Name: string;
  "IP address": string;
  Login: string;
  Password: string;
  "Alt Login": string;
  "Alt Passwd": string;
  Description: string;
  Notes: string;
  Cores?: number;
  "Ram (GB)"?: number;
  Inactive?: number;
  "RDP?"?: number;
  "VNC?"?: number;
  "SSH?"?: number;
  "Web?"?: number;
}

// Resource defaults (can be overridden via environment variables)
const CONTAINER_DEFAULT_CORES = parseInt(process.env.NEXT_PUBLIC_CONTAINER_DEFAULT_CORES || "0", 10);
const CONTAINER_DEFAULT_RAM = parseInt(process.env.NEXT_PUBLIC_CONTAINER_DEFAULT_RAM || "1", 10);
const DAEMON_DEFAULT_CORES = parseInt(process.env.NEXT_PUBLIC_DAEMON_DEFAULT_CORES || "1", 10);
const DAEMON_DEFAULT_RAM = parseInt(process.env.NEXT_PUBLIC_DAEMON_DEFAULT_RAM || "2", 10);

// OS overhead for host RAM (Windows uses more than Linux/other)
const WINDOWS_OS_RAM = parseInt(process.env.NEXT_PUBLIC_WINDOWS_OS_RAM || "4", 10);
const OTHER_OS_RAM = parseInt(process.env.NEXT_PUBLIC_OTHER_OS_RAM || "1", 10);

// Helper to detect if a host is running Windows
const isWindowsHost = (hostInfo: CoreInfrastructure | null): boolean => {
  if (!hostInfo) return false;
  const desc = (hostInfo.Description || "").toLowerCase();
  const name = (hostInfo.Name || "").toLowerCase();
  const notes = (hostInfo.Notes || "").toLowerCase();
  return desc.includes("windows") || name.includes("windows") || notes.includes("hyper-v") || notes.includes("hyperv");
};

interface HostGroupedViewProps {
  vms: VM[];
  containers: Container[];
  daemons: Daemon[];
  coreInfra: CoreInfrastructure[];
  onSearch?: (term: string) => void;
  onAdd?: () => void;
}

export function HostGroupedView({ vms, containers, daemons, coreInfra, onAdd }: HostGroupedViewProps) {
  const [expandedHosts, setExpandedHosts] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHost, setSelectedHost] = useState<CoreInfrastructure | null>(null);
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());

  // Helper to get IP prefix (first 3 octets)
  const getIpPrefix = (ip: string): string => {
    if (!ip) return "";
    const parts = ip.split(".");
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
    return ip;
  };

  // Group type with resource calculations
  interface HostGroup {
    vms: VM[];
    containers: Container[];
    daemons: Daemon[];
    hostInfo: CoreInfrastructure | null;
    allocatedCores: number;
    allocatedRam: number;
    osOverheadRam: number; // RAM used by host OS
  }

  // Group VMs, Containers, and Daemons by host
  const groupedData = useMemo(() => {
    const groups: Record<string, HostGroup> = {};

    // Filter by search term
    const filteredVMs = vms.filter(vm =>
      !searchTerm ||
      vm.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vm.Host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vm.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContainers = containers.filter(c =>
      !searchTerm ||
      c.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredDaemons = daemons.filter(d =>
      !searchTerm ||
      d.Name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.Host?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.IP?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Build a map of host IPs to host names for matching
    const hostIpToName: Record<string, string> = {};
    const hostPrefixToName: Record<string, string> = {};

    // Helper to create a new group
    const createGroup = (hostName: string): HostGroup => {
      const hostInfo = coreInfra.find(h =>
        h.Name?.toLowerCase() === hostName.toLowerCase() ||
        h["IP address"] === hostName
      ) || null;
      // Calculate OS overhead based on host type
      const osOverheadRam = isWindowsHost(hostInfo) ? WINDOWS_OS_RAM : OTHER_OS_RAM;
      return { vms: [], containers: [], daemons: [], hostInfo, allocatedCores: 0, allocatedRam: 0, osOverheadRam };
    };

    // Group VMs by host and build host IP mappings
    filteredVMs.forEach(vm => {
      const hostName = vm.Host || "Unknown Host";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
        const hostInfo = groups[hostName].hostInfo;

        // Map host IP to host name for container/daemon matching
        if (hostInfo?.["IP address"]) {
          hostIpToName[hostInfo["IP address"]] = hostName;
          hostPrefixToName[getIpPrefix(hostInfo["IP address"])] = hostName;
        }
        // Also map if host name itself looks like an IP
        if (hostName.match(/^\d+\.\d+\.\d+\.\d+$/)) {
          hostIpToName[hostName] = hostName;
          hostPrefixToName[getIpPrefix(hostName)] = hostName;
        }
      }
      groups[hostName].vms.push(vm);
    });

    // Also check coreInfra for additional hosts that might not have VMs
    coreInfra.forEach(host => {
      if (host["IP address"]) {
        const ip = host["IP address"];
        if (!hostIpToName[ip]) {
          hostIpToName[ip] = host.Name || ip;
          hostPrefixToName[getIpPrefix(ip)] = host.Name || ip;
        }
      }
    });

    // Group containers - match to hosts by IP or IP prefix
    filteredContainers.forEach(container => {
      let matchedHost: string | null = null;

      // 1. Check if container has explicit Host field
      if (container.Host) {
        matchedHost = container.Host;
      }
      // 2. Check if container IP directly matches a host IP
      else if (container.IP && hostIpToName[container.IP]) {
        matchedHost = hostIpToName[container.IP];
      }
      // 3. Check if container IP prefix matches a host IP prefix (same subnet)
      else if (container.IP) {
        const containerPrefix = getIpPrefix(container.IP);
        if (hostPrefixToName[containerPrefix]) {
          matchedHost = hostPrefixToName[containerPrefix];
        }
      }
      // 4. Check Grouping field - it might contain host info
      else if (container.Grouping) {
        const groupingLower = container.Grouping.toLowerCase();
        for (const hostName of Object.keys(groups)) {
          if (hostName.toLowerCase().includes(groupingLower) ||
              groupingLower.includes(hostName.toLowerCase())) {
            matchedHost = hostName;
            break;
          }
        }
      }

      const hostName = matchedHost || "Unassigned Containers";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
      }
      groups[hostName].containers.push(container);
    });

    // Group daemons by host
    filteredDaemons.forEach(daemon => {
      let matchedHost: string | null = null;

      // 1. Check if daemon has explicit Host field
      if (daemon.Host) {
        matchedHost = daemon.Host;
      }
      // 2. Check if daemon IP directly matches a host IP
      else if (daemon.IP && hostIpToName[daemon.IP]) {
        matchedHost = hostIpToName[daemon.IP];
      }
      // 3. Check if daemon IP prefix matches a host IP prefix
      else if (daemon.IP) {
        const daemonPrefix = getIpPrefix(daemon.IP);
        if (hostPrefixToName[daemonPrefix]) {
          matchedHost = hostPrefixToName[daemonPrefix];
        }
      }

      const hostName = matchedHost || "Unassigned Daemons";
      if (!groups[hostName]) {
        groups[hostName] = createGroup(hostName);
      }
      groups[hostName].daemons.push(daemon);
    });

    // Calculate allocated resources for each host
    Object.values(groups).forEach(group => {
      // VMs: use actual values
      group.vms.forEach(vm => {
        const cores = parseInt(String(vm["Assigned cores"] || 0), 10);
        const ram = vm["Startup memory (GB)"] || 0;
        group.allocatedCores += cores;
        group.allocatedRam += ram;
      });

      // Containers: use defaults
      group.allocatedCores += group.containers.length * CONTAINER_DEFAULT_CORES;
      group.allocatedRam += group.containers.length * CONTAINER_DEFAULT_RAM;

      // Daemons: use defaults
      group.allocatedCores += group.daemons.length * DAEMON_DEFAULT_CORES;
      group.allocatedRam += group.daemons.length * DAEMON_DEFAULT_RAM;
    });

    return groups;
  }, [vms, containers, daemons, coreInfra, searchTerm]);

  const toggleHost = (hostName: string) => {
    const newExpanded = new Set(expandedHosts);
    if (newExpanded.has(hostName)) {
      newExpanded.delete(hostName);
    } else {
      newExpanded.add(hostName);
    }
    setExpandedHosts(newExpanded);
  };

  const expandAll = () => {
    setExpandedHosts(new Set(Object.keys(groupedData)));
  };

  const collapseAll = () => {
    setExpandedHosts(new Set());
  };

  const togglePassword = (key: string) => {
    const newShow = new Set(showPasswords);
    if (newShow.has(key)) {
      newShow.delete(key);
    } else {
      newShow.add(key);
    }
    setShowPasswords(newShow);
  };

  // Connection handlers
  const openRDP = (ip: string) => {
    // Create RDP file content and download it
    const rdpContent = `full address:s:${ip}\nprompt for credentials:i:1`;
    const blob = new Blob([rdpContent], { type: "application/x-rdp" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ip}.rdp`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openVNC = (ip: string) => {
    // VNC typically uses vnc:// protocol
    window.open(`vnc://${ip}:5900`, "_blank");
  };

  const openSSH = (ip: string, username?: string) => {
    // SSH uses ssh:// protocol or can open terminal
    const sshUrl = username ? `ssh://${username}@${ip}` : `ssh://${ip}`;
    window.open(sshUrl, "_blank");
  };

  const openWebUI = (ip: string, port?: number) => {
    const url = port ? `http://${ip}:${port}` : `http://${ip}`;
    window.open(url, "_blank");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Helper to convert IP to numeric for proper sorting
  const ipToNum = (ip: string): number => {
    if (!ip) return 0;
    const parts = ip.split('.');
    if (parts.length !== 4) return 0;
    return parts.reduce((acc, part) => acc * 256 + (parseInt(part, 10) || 0), 0);
  };

  const sortedHosts = Object.keys(groupedData).sort((a, b) => {
    // Put "Unknown Host" and "Unassigned Containers" at the end
    if (a.includes("Unknown") || a.includes("Unassigned")) return 1;
    if (b.includes("Unknown") || b.includes("Unassigned")) return -1;

    // Sort by host IP address
    const hostAInfo = groupedData[a].hostInfo;
    const hostBInfo = groupedData[b].hostInfo;
    const ipA = hostAInfo?.["IP address"] || '';
    const ipB = hostBInfo?.["IP address"] || '';

    return ipToNum(ipA) - ipToNum(ipB);
  });

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search and Controls */}
      <div className="flex gap-4 items-center flex-wrap">
        <input
          type="text"
          placeholder="Search VMs, containers, daemons, or hosts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={expandAll}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer text-[0.8125rem] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-pointer text-[0.8125rem] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
        >
          Collapse All
        </button>
        {onAdd && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white border-none rounded-md text-sm font-medium cursor-pointer transition-colors"
          >
            + Add New
          </button>
        )}
        <div className="text-[0.8125rem] text-gray-500 dark:text-gray-400">
          {Object.keys(groupedData).length} hosts | {vms.length} VMs | {containers.length} containers | {daemons.length} daemons
        </div>
      </div>

      {/* Grouped List */}
      <div className="flex-1 overflow-auto">
        {sortedHosts.map((hostName) => {
          const group = groupedData[hostName];
          const isExpanded = expandedHosts.has(hostName);
          const hostInfo = group.hostInfo;
          // Resource info - calculate available RAM after OS overhead
          const hostCores = hostInfo?.Cores;
          const hostRam = hostInfo?.["Ram (GB)"];
          const availableRam = hostRam !== undefined ? hostRam - group.osOverheadRam : undefined;
          return (
            <div
              key={hostName}
              className="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              {/* Host Header */}
              <div
                className={`flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors ${isExpanded ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                onClick={() => toggleHost(hostName)}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-base transition-transform duration-200 text-gray-600 dark:text-gray-400 ${isExpanded ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <div>
                    <div className="font-semibold text-[0.9375rem] text-gray-900 dark:text-gray-100">
                      {hostName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {hostInfo?.["IP address"] && `IP: ${hostInfo["IP address"]} | `}
                      {group.vms.length} VMs, {group.containers.length} containers{group.daemons.length > 0 && `, ${group.daemons.length} daemons`}
                    </div>
                  </div>

                  {/* Resource allocation display */}
                  {(group.allocatedCores > 0 || group.allocatedRam > 0) && (
                    <div className="flex gap-3 ml-4 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[0.6875rem]">
                      <div title="Allocated Cores">
                        <span className="text-gray-500 dark:text-gray-400">Cores: </span>
                        <span className={`font-semibold ${hostCores && group.allocatedCores > hostCores ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {group.allocatedCores}
                        </span>
                        {hostCores !== undefined && (
                          <span className="text-gray-400 dark:text-gray-500"> / {hostCores}</span>
                        )}
                      </div>
                      <div title={`Allocated RAM (GB) - OS uses ${group.osOverheadRam}GB`}>
                        <span className="text-gray-500 dark:text-gray-400">RAM: </span>
                        <span className={`font-semibold ${availableRam !== undefined && group.allocatedRam > availableRam ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {group.allocatedRam}GB
                        </span>
                        {availableRam !== undefined && (
                          <span className="text-gray-400 dark:text-gray-500"> / {availableRam}GB</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Host Action Buttons */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {hostInfo && (
                    <button
                      onClick={() => setSelectedHost(hostInfo)}
                      className="px-3 py-1.5 border border-indigo-500 dark:border-indigo-400 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 cursor-pointer text-xs font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                      title="View host credentials"
                    >
                      Credentials
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["RDP?"] === 1 && (
                    <button
                      onClick={() => openRDP(hostInfo["IP address"])}
                      className="px-3 py-1.5 border border-blue-500 dark:border-blue-400 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 cursor-pointer text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      title="Open Remote Desktop"
                    >
                      RDP
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["VNC?"] === 1 && (
                    <button
                      onClick={() => openVNC(hostInfo["IP address"])}
                      className="px-3 py-1.5 border border-violet-500 dark:border-violet-400 rounded bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 cursor-pointer text-xs font-medium hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                      title="Open VNC"
                    >
                      VNC
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["SSH?"] === 1 && (
                    <button
                      onClick={() => openSSH(hostInfo["IP address"], hostInfo.Login)}
                      className="px-3 py-1.5 border border-emerald-600 dark:border-emerald-400 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 cursor-pointer text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      title="Open SSH"
                    >
                      SSH
                    </button>
                  )}
                  {hostInfo?.["IP address"] && hostInfo["Web?"] === 1 && (
                    <button
                      onClick={() => openWebUI(hostInfo["IP address"])}
                      className="px-3 py-1.5 border border-amber-500 dark:border-amber-400 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 cursor-pointer text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                      title="Open Web UI"
                    >
                      Web
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content - Card Grid Layout */}
              {isExpanded && (
                <div className="p-3 bg-white dark:bg-gray-800">
                  {/* Combined VMs and Containers in a single card grid */}
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                    {/* VM Cards */}
                    {group.vms.map((vm, idx) => (
                      <div
                        key={`vm-${vm.Name}-${idx}`}
                        className={`p-2 rounded-md flex flex-col min-h-[90px] ${
                          vm.Active === 1
                            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                            : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {/* Header with name and badges */}
                        <div className="mb-1">
                          <div
                            className="font-semibold text-[0.8125rem] text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis"
                            title={vm.Name}
                          >
                            {vm.Name}
                          </div>
                          <div className="flex gap-1 flex-wrap mt-0.5">
                            <span className="text-[0.625rem] px-1 py-px rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300">
                              VM
                            </span>
                            {vm.Type && (
                              <span className="text-[0.625rem] px-1 py-px rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                                {vm.Type}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* IP and specs */}
                        <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 flex-1">
                          {vm.IP && <div className="font-mono">{vm.IP}</div>}
                          <div>
                            {vm["Startup memory (GB)"] && <span>{vm["Startup memory (GB)"]}GB</span>}
                            {vm["Assigned cores"] && <span> / {vm["Assigned cores"]}c</span>}
                          </div>
                          {/* Startup Notes */}
                          {vm["Startup Notes"] && (
                            <div
                              className="mt-1 p-1 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded text-[0.625rem] text-amber-800 dark:text-amber-300 leading-tight"
                              title={vm["Startup Notes"]}
                            >
                              {vm["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 mt-1.5">
                          {vm.IP && (
                            <>
                              <button
                                onClick={() => openRDP(vm.IP)}
                                className="flex-1 px-1 py-1 border-none rounded bg-blue-500 hover:bg-blue-600 text-white cursor-pointer text-[0.625rem] font-medium transition-colors"
                                title="RDP to VM"
                              >
                                RDP
                              </button>
                              <button
                                onClick={() => copyToClipboard(vm.IP)}
                                className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer text-[0.625rem] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                title="Copy IP"
                              >
                                IP
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Container Cards */}
                    {group.containers.map((container, idx) => (
                      <div
                        key={`container-${container.Name}-${idx}`}
                        className="p-2 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-md flex flex-col min-h-[90px]"
                      >
                        {/* Header with name and badge */}
                        <div className="mb-1">
                          <div
                            className="font-semibold text-[0.8125rem] text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis"
                            title={container.Name}
                          >
                            {container.Name}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-[0.625rem] px-1 py-px rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300">
                              Container
                            </span>
                          </div>
                        </div>

                        {/* IP and port */}
                        <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 flex-1">
                          {container.IP && <div className="font-mono">{container.IP}</div>}
                          {container.Port && <div>Port: {container.Port}</div>}
                          {/* Startup Notes */}
                          {container["Startup Notes"] && (
                            <div
                              className="mt-1 p-1 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded text-[0.625rem] text-amber-800 dark:text-amber-300 leading-tight"
                              title={container["Startup Notes"]}
                            >
                              {container["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 mt-1.5">
                          {container.IP && container.Port && (
                            <button
                              onClick={() => openWebUI(container.IP, container.Port)}
                              className="flex-1 px-1 py-1 border-none rounded bg-amber-500 hover:bg-amber-600 text-white cursor-pointer text-[0.625rem] font-medium transition-colors"
                              title="Open Web UI"
                            >
                              Open
                            </button>
                          )}
                          {container.IP && (
                            <button
                              onClick={() => copyToClipboard(container.Port ? `${container.IP}:${container.Port}` : container.IP)}
                              className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer text-[0.625rem] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                              title="Copy address"
                            >
                              IP
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Daemon Cards */}
                    {group.daemons.map((daemon, idx) => (
                      <div
                        key={`daemon-${daemon.Name}-${idx}`}
                        className={`p-2 rounded-md flex flex-col min-h-[90px] ${
                          daemon.Inactive === 1
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border border-fuchsia-200 dark:border-fuchsia-800'
                        }`}
                      >
                        {/* Header with name and badge */}
                        <div className="mb-1">
                          <div
                            className="font-semibold text-[0.8125rem] text-gray-900 dark:text-gray-100 whitespace-nowrap overflow-hidden text-ellipsis"
                            title={daemon.Name}
                          >
                            {daemon.Name}
                          </div>
                          <div className="flex gap-1 mt-0.5">
                            <span className="text-[0.625rem] px-1 py-px rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300">
                              Daemon
                            </span>
                            {daemon.Inactive === 1 && (
                              <span className="text-[0.625rem] px-1 py-px rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>

                        {/* IP and user */}
                        <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 flex-1">
                          {daemon.IP && <div className="font-mono">{daemon.IP}</div>}
                          {daemon.User && <div>User: {daemon.User}</div>}
                          {/* Startup Notes */}
                          {daemon["Startup Notes"] && (
                            <div
                              className="mt-1 p-1 bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded text-[0.625rem] text-amber-800 dark:text-amber-300 leading-tight"
                              title={daemon["Startup Notes"]}
                            >
                              {daemon["Startup Notes"]}
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1 mt-1.5">
                          {daemon.IP && (
                            <>
                              <button
                                onClick={() => openRDP(daemon.IP)}
                                className="flex-1 px-1 py-1 border-none rounded bg-violet-500 hover:bg-violet-600 text-white cursor-pointer text-[0.625rem] font-medium transition-colors"
                                title="RDP to Daemon"
                              >
                                RDP
                              </button>
                              <button
                                onClick={() => copyToClipboard(daemon.IP)}
                                className="px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer text-[0.625rem] hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                title="Copy IP"
                              >
                                IP
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Empty state */}
                  {group.vms.length === 0 && group.containers.length === 0 && group.daemons.length === 0 && (
                    <div className="text-center p-4 text-gray-400 dark:text-gray-500 text-sm">
                      No VMs, containers, or daemons
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {sortedHosts.length === 0 && (
          <div className="text-center p-12 text-gray-500 dark:text-gray-400">
            No VMs, containers, or daemons found{searchTerm ? ` matching "${searchTerm}"` : ""}.
          </div>
        )}
      </div>

      {/* Host Credentials Modal */}
      {selectedHost && (
        <div
          className="fixed inset-0 bg-black/50 flex items-start justify-center pt-12 z-[1000] overflow-auto"
          onClick={() => setSelectedHost(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-[500px] w-[90%] max-h-[calc(100vh-6em)] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 m-0">
                {selectedHost.Name}
              </h3>
              <button
                onClick={() => setSelectedHost(null)}
                className="px-2 py-1 border-none bg-transparent cursor-pointer text-xl text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                ×
              </button>
            </div>

            <div className="grid gap-3">
              {/* IP Address */}
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">IP Address</div>
                  <div className="font-medium font-mono text-gray-900 dark:text-gray-100">{selectedHost["IP address"] || "N/A"}</div>
                </div>
                {selectedHost["IP address"] && (
                  <button
                    onClick={() => copyToClipboard(selectedHost["IP address"])}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Login */}
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Login</div>
                  <div className="font-medium font-mono text-gray-900 dark:text-gray-100">{selectedHost.Login || "N/A"}</div>
                </div>
                {selectedHost.Login && (
                  <button
                    onClick={() => copyToClipboard(selectedHost.Login)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                  >
                    Copy
                  </button>
                )}
              </div>

              {/* Password */}
              <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Password</div>
                  <div className="font-medium font-mono text-gray-900 dark:text-gray-100">
                    {showPasswords.has("main") ? selectedHost.Password || "N/A" : "••••••••"}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => togglePassword("main")}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                  >
                    {showPasswords.has("main") ? "Hide" : "Show"}
                  </button>
                  {selectedHost.Password && (
                    <button
                      onClick={() => copyToClipboard(selectedHost.Password)}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              {/* Alt Login */}
              {selectedHost["Alt Login"] && (
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Alt Login</div>
                    <div className="font-medium font-mono text-gray-900 dark:text-gray-100">{selectedHost["Alt Login"]}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(selectedHost["Alt Login"])}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                  >
                    Copy
                  </button>
                </div>
              )}

              {/* Alt Password */}
              {selectedHost["Alt Passwd"] && (
                <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Alt Password</div>
                    <div className="font-medium font-mono text-gray-900 dark:text-gray-100">
                      {showPasswords.has("alt") ? selectedHost["Alt Passwd"] : "••••••••"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => togglePassword("alt")}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                    >
                      {showPasswords.has("alt") ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedHost["Alt Passwd"])}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 cursor-pointer text-xs hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              {/* Description */}
              {selectedHost.Description && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Description</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{selectedHost.Description}</div>
                </div>
              )}

              {/* Notes */}
              {selectedHost.Notes && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Notes</div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{selectedHost.Notes}</div>
                </div>
              )}
            </div>

            {/* Quick Connect Buttons */}
            <div className="flex gap-2 mt-5 justify-center flex-wrap">
              {selectedHost["IP address"] && selectedHost["RDP?"] === 1 && (
                <button
                  onClick={() => openRDP(selectedHost["IP address"])}
                  className="px-4 py-2 border-none rounded-md bg-blue-500 hover:bg-blue-600 text-white cursor-pointer text-sm font-medium transition-colors"
                >
                  RDP
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["VNC?"] === 1 && (
                <button
                  onClick={() => openVNC(selectedHost["IP address"])}
                  className="px-4 py-2 border-none rounded-md bg-violet-500 hover:bg-violet-600 text-white cursor-pointer text-sm font-medium transition-colors"
                >
                  VNC
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["SSH?"] === 1 && (
                <button
                  onClick={() => openSSH(selectedHost["IP address"], selectedHost.Login)}
                  className="px-4 py-2 border-none rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-sm font-medium transition-colors"
                >
                  SSH
                </button>
              )}
              {selectedHost["IP address"] && selectedHost["Web?"] === 1 && (
                <button
                  onClick={() => openWebUI(selectedHost["IP address"])}
                  className="px-4 py-2 border-none rounded-md bg-amber-500 hover:bg-amber-600 text-white cursor-pointer text-sm font-medium transition-colors"
                >
                  Web
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
