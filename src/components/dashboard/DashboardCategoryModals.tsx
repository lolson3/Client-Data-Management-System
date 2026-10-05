"use client";

import { CategoryPanel } from "@/components/CategoryPanel";
import { CategoryTableView } from "@/components/CategoryTableView";
import { type SortConfig } from "@/components/DataTable";
import { FullPageModal } from "@/components/FullPageModal";
import { HostGroupedView } from "@/components/HostGroupedView";
import { ReportsPanel } from "@/components/dashboard/ReportsPanel";
import { CATEGORY_TABLE_DEFINITIONS } from "@/config/categoryTableDefinitions";

export interface DashboardCategoryData {
  accessAccounts: any[];
  allDevices: any[];
  allUserRecords: any[];
  applicationsProviders: any[];
  cameras: any[];
  containers: any[];
  coreInfra: any[];
  daemons: any[];
  devices: any[];
  emails: any[];
  externalInfo: any[];
  miscData: any[];
  networkDevices: any[];
  serverDirectoryRows: any[];
  services: any[];
  systemsServices: any[];
  typedDomains: any[];
  userDirectory: any[];
  users: any[];
  vms: any[];
  webDomains: any[];
  websites: any[];
  workstations: any[];
  workstationsUsers: any[];
}

interface DashboardCategoryModalsProps {
  openModal: string | null;
  onOpenModal: (modal: string | null) => void;
  submittedWorkspaceSearch: string;
  submittedWorkspaceSearchResults: Array<{
    section: string;
    modal: string;
    record: string;
    matches: Array<{ field: string; value: string }>;
  }>;
  data: DashboardCategoryData;
  localDomainName: string;
  directoryAdminLogin: string;
  getSortConfig: (tableId: string) => SortConfig | undefined;
  onSortChange: (tableId: string, sortConfig: SortConfig | null) => void;
  onDerivedNoteChange: (row: any, columnKey: string, value: string) => Promise<boolean>;
  onDerivedActiveChange: (row: any, active: boolean) => Promise<boolean>;
  onCellEdit: (fileKey: string, row: any, columnKey: string, newValue: any, identifierKeys: string[]) => Promise<boolean>;
  onArchive: (fileKey: string, row: any, identifierKeys: string[], inactiveColumn?: string) => Promise<boolean>;
  onMiscCellEdit: (row: any, columnKey: string, newValue: any) => Promise<boolean>;
  onMiscDeleteRow: (row: any) => Promise<boolean>;
  onAddRecord: (type: string) => void;
}

export function DashboardCategoryModals({
  openModal,
  onOpenModal,
  submittedWorkspaceSearch,
  submittedWorkspaceSearchResults,
  data,
  localDomainName,
  directoryAdminLogin,
  getSortConfig,
  onSortChange,
  onDerivedNoteChange,
  onDerivedActiveChange,
  onCellEdit,
  onArchive,
  onMiscCellEdit,
  onMiscDeleteRow,
  onAddRecord,
}: DashboardCategoryModalsProps) {
  const {
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
  } = data;
  const setOpenModal = onOpenModal;
  const setAddModalType = onAddRecord;
  const handleSortChange = onSortChange;
  const handleDerivedNoteChange = onDerivedNoteChange;
  const handleDerivedActiveChange = onDerivedActiveChange;
  const handleCellEdit = onCellEdit;
  const handleInactivate = onArchive;
  const handleMiscCellEdit = onMiscCellEdit;
  const handleMiscDeleteRow = onMiscDeleteRow;

  return (
    <>
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
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row._users.map((user: any, i: number) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.name}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.login}</td>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100">{user.phone}</td>
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
        <ReportsPanel
          coreInfra={coreInfra}
          daemons={daemons}
          emails={emails}
          externalInfo={externalInfo}
          services={services}
          users={users}
          vms={vms}
          workstationsUsers={workstationsUsers}
        />
      </FullPageModal>


    </>
  );
}
