"use client";

import { useState } from "react";
import { CategoryPanel } from "@/components/CategoryPanel";

interface ReportsPanelProps {
  coreInfra: any[];
  daemons: any[];
  emails: any[];
  externalInfo: any[];
  services: any[];
  users: any[];
  vms: any[];
  workstationsUsers: any[];
}

type ReportsTab = "inactive" | "missingData" | "mfaStatus" | "firmware" | "resources" | "passwordAge" | "win11";

export function ReportsPanel({
  coreInfra,
  daemons,
  emails,
  externalInfo,
  services,
  users,
  vms,
  workstationsUsers,
}: ReportsPanelProps) {
  const [reportsTab, setReportsTab] = useState<ReportsTab>("inactive");

  return (
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
  );
}
