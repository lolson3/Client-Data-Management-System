"use client";

import { AddRecordModal, type FieldConfig } from "@/components/AddRecordModal";

type SaveRecord = (fileKey: string, data: Record<string, unknown>) => Promise<boolean>;
type SaveCompany = (mode: "add" | "update", data: Record<string, unknown>) => Promise<boolean>;

interface CompanyOption {
  label: string;
}

interface DashboardRecordDialogsProps {
  addModalType: string | null;
  closeAddModal: () => void;
  selectedClient: string;
  saveRecord: SaveRecord;
  saveMiscNote: (data: Record<string, unknown>) => Promise<boolean>;
  whoisAvailable: boolean;
  runWhoisLookup: () => Promise<Record<string, unknown> | null>;
  companyModalMode: "add" | "selectForUpdate" | "update" | null;
  setCompanyModalMode: (mode: "add" | "selectForUpdate" | "update" | null) => void;
  clients: CompanyOption[];
  companyEditTarget: string | null;
  companyEditData: Record<string, any> | null;
  clearCompanyEdit: () => void;
  saveCompany: SaveCompany;
  selectCompanyForUpdate: (data: Record<string, unknown>) => Promise<boolean>;
}

interface RecordDialogDefinition {
  title: string;
  fileKey: string;
  fields: FieldConfig[];
}

const recordDialogDefinitions: Record<string, RecordDialogDefinition> = {
  core: {
    title: "Add Server/Switch",
    fileKey: "core",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Name", label: "Name", required: true },
      { key: "SubName", label: "Location" },
      { key: "IP address", label: "IP Address", type: "ip" },
      { key: "Machine Name / MAC", label: "Machine Name/MAC" },
      { key: "Service Tag", label: "Service Tag" },
      { key: "Description", label: "Description" },
      { key: "Login", label: "Login" },
      { key: "Password", label: "Password", type: "password" },
      { key: "Notes", label: "Notes" },
      { key: "Cores", label: "Cores", type: "number" },
      { key: "Ram (GB)", label: "RAM (GB)", type: "number" },
      { key: "On Landing Page", label: "Landing Page", type: "checkbox" },
      { key: "RDP?", label: "RDP", type: "checkbox" },
      { key: "VNC?", label: "VNC", type: "checkbox" },
      { key: "SSH?", label: "SSH", type: "checkbox" },
      { key: "Web?", label: "Web", type: "checkbox" },
      { key: "AD Server", label: "AD Server", type: "checkbox" },
    ],
  },
  websites: {
    title: "Add Website / DNS Record",
    fileKey: "websites",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Registrar", label: "Registrar" },
      { key: "Registrar Credential Location", label: "Registrar Credential Location", type: "select", options: ["Local", "Password Manager", "Client"] },
      { key: "Registrar Username", label: "Registrar Username", visibleWhen: { key: "Registrar Credential Location", value: "Local" } },
      { key: "Registrar Password", label: "Registrar Password", type: "password", visibleWhen: { key: "Registrar Credential Location", value: "Local" } },
      { key: "DNS Host", label: "DNS Host" },
      { key: "DNS Server Credential Location", label: "DNS Credential Location", type: "select", options: ["Local", "Password Manager", "Client"] },
      { key: "DNS Username", label: "DNS Username", visibleWhen: { key: "DNS Server Credential Location", value: "Local" } },
      { key: "DNS Password", label: "DNS Password", type: "password", visibleWhen: { key: "DNS Server Credential Location", value: "Local" } },
      { key: "Website Host", label: "Website Host" },
      { key: "Website Credential Location", label: "Website Credential Location", type: "select", options: ["Local", "Password Manager", "Client"] },
      { key: "Website Username", label: "Website Username", visibleWhen: { key: "Website Credential Location", value: "Local" } },
      { key: "Website Password", label: "Website Password", type: "password", visibleWhen: { key: "Website Credential Location", value: "Local" } },
      { key: "URL", label: "URL", type: "url" },
      { key: "Notes", label: "Notes" },
    ],
  },
  services: {
    title: "Add Service",
    fileKey: "services",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Service", label: "Service", required: true },
      { key: "Username", label: "Username" },
      { key: "Password", label: "Password", type: "password" },
      { key: "Host / URL", label: "Host/URL" },
      { key: "Date of last known change", label: "Date of Last Known Change" },
      { key: "Notes", label: "Notes", type: "textarea" },
    ],
  },
  users: {
    title: "Add User",
    fileKey: "users",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Name", label: "Name", required: true },
      { key: "Login", label: "Login", required: true },
      { key: "Password", label: "Password", type: "password" },
      { key: "Computer Name", label: "Computer Name" },
      { key: "SubName", label: "Location" },
      { key: "Phone", label: "Phone" },
      { key: "Notes", label: "Notes", type: "textarea" },
      { key: "Notes 2", label: "Notes 2", type: "textarea" },
      { key: "Epicor Number", label: "Epicor #" },
      { key: "Active", label: "Active", type: "checkbox", defaultValue: 1 },
      { key: "Grouping", label: "Grouping" },
    ],
  },
  workstations: {
    title: "Add Workstation",
    fileKey: "workstations",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Computer Name", label: "Computer Name", required: true },
      { key: "IP Address", label: "IP Address" },
      { key: "Service Tag", label: "Service Tag" },
      { key: "CPU", label: "CPU" },
      { key: "Description", label: "Description" },
      { key: "Upstream", label: "Upstream" },
      { key: "Notes", label: "Notes", type: "textarea" },
      { key: "Notes 2", label: "Notes 2", type: "textarea" },
      { key: "Active", label: "Active", type: "checkbox", defaultValue: 1 },
      { key: "Grouping", label: "Grouping" },
      { key: "Win11 Capable", label: "Win11 Capable", type: "checkbox", defaultValue: 0 },
    ],
  },
  vms: {
    title: "Add Virtual Machine",
    fileKey: "vms",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Name", label: "Name", required: true },
      { key: "Location", label: "Location" },
      { key: "IP", label: "IP Address" },
      { key: "Type", label: "Type" },
      { key: "Host", label: "Host" },
      { key: "Startup memory (GB)", label: "Startup Memory (GB)" },
      { key: "Assigned cores", label: "Assigned Cores" },
      { key: "Assigned To", label: "Assigned To" },
      { key: "Notes", label: "Notes", type: "textarea" },
      { key: "Grouping", label: "Grouping" },
      { key: "Active", label: "Active", type: "checkbox", defaultValue: 1 },
      { key: "Startup Notes", label: "Startup Notes", type: "textarea" },
    ],
  },
  devices: {
    title: "Add Device",
    fileKey: "devices",
    fields: [
      { key: "client", label: "Client", autoFill: true },
      { key: "Name", label: "Name", required: true },
      { key: "Device Type", label: "Device Type", required: true },
      { key: "IP address", label: "IP Address" },
      { key: "Machine Name / MAC", label: "Machine Name/MAC" },
      { key: "Service Tag", label: "Service Tag" },
      { key: "Login", label: "Login" },
      { key: "Password", label: "Password", type: "password" },
      { key: "Note", label: "Note" },
      { key: "Note 1", label: "Note 1" },
      { key: "Note 2", label: "Note 2" },
      { key: "Note 3", label: "Note 3" },
      { key: "Grouping", label: "Grouping" },
    ],
  },
  emails: {
    title: "Add Email Account",
    fileKey: "emails",
    fields: [
      { key: "Client", label: "Client", autoFill: true },
      { key: "Username", label: "Username", required: true },
      { key: "Email", label: "Email", type: "email", required: true },
      { key: "Name", label: "Name" },
      { key: "Password", label: "Password", type: "password" },
      { key: "Notes", label: "Notes", type: "textarea" },
      { key: "Active", label: "Active", type: "checkbox", defaultValue: 1 },
      { key: "MFA or Ignore", label: "MFA Enabled", type: "checkbox", defaultValue: 0 },
      { key: "OWA_override", label: "OWA Override", type: "checkbox", defaultValue: 0 },
      { key: "IMAP_override", label: "IMAP Override", type: "checkbox", defaultValue: 0 },
      { key: "POP_override", label: "POP Override", type: "checkbox", defaultValue: 0 },
      { key: "SMTP_override", label: "SMTP Override", type: "checkbox", defaultValue: 0 },
    ],
  },
  misc: {
    title: "Add Note",
    fileKey: "misc",
    fields: [{ key: "Notes", label: "Note", type: "textarea", required: true }],
  },
};

function withClient(fields: FieldConfig[], selectedClient: string): FieldConfig[] {
  return fields.map(field => (
    field.key === "Client" || field.key === "client"
      ? { ...field, defaultValue: selectedClient }
      : field
  ));
}

export function DashboardRecordDialogs({
  addModalType,
  closeAddModal,
  selectedClient,
  saveRecord,
  saveMiscNote,
  whoisAvailable,
  runWhoisLookup,
  companyModalMode,
  setCompanyModalMode,
  clients,
  companyEditTarget,
  companyEditData,
  clearCompanyEdit,
  saveCompany,
  selectCompanyForUpdate,
}: DashboardRecordDialogsProps) {
  const activeDefinition = addModalType ? recordDialogDefinitions[addModalType] : undefined;

  return (
    <>
      <AddRecordModal
        isOpen={companyModalMode === "add"}
        onClose={() => setCompanyModalMode(null)}
        title="Add Client Company"
        fields={[
          { key: "Company Name", label: "Company Name", required: true },
          { key: "Abbrv", label: "Abbreviation", required: true },
          { key: "Group", label: "Group" },
          { key: "Main Phones", label: "Main Phones", type: "phone-list", defaultValue: [{ Name: "", Number: "" }] },
          { key: "Status", label: "Status", type: "select", options: ["0", "1", "2"], defaultValue: "0" },
        ]}
        onSave={data => saveCompany("add", data)}
      />

      <AddRecordModal
        isOpen={companyModalMode === "selectForUpdate"}
        onClose={() => setCompanyModalMode(null)}
        title="Select Company to Update"
        fields={[{ key: "companyLabel", label: "Company", required: true, type: "select", options: clients.map(client => client.label) }]}
        onSave={selectCompanyForUpdate}
      />

      <AddRecordModal
        isOpen={companyModalMode === "update"}
        onClose={() => {
          setCompanyModalMode(null);
          clearCompanyEdit();
        }}
        title="Update Client Company"
        fields={[
          { key: "Abbrv", label: "Abbreviation", autoFill: true, defaultValue: companyEditTarget || "" },
          { key: "Company Name", label: "Company Name", required: true, defaultValue: companyEditData?.["Company Name"] || "" },
          { key: "Group", label: "Group", defaultValue: companyEditData?.Group || "" },
          { key: "Main Phones", label: "Main Phones", type: "phone-list", defaultValue: companyEditData?.["Main Phones"]?.length ? companyEditData["Main Phones"] : [{ Name: "", Number: "" }] },
          { key: "Status", label: "Status", type: "select", options: ["0", "1", "2"], defaultValue: String(companyEditData?.Status ?? "0") },
        ]}
        onSave={data => saveCompany("update", data)}
      />

      {activeDefinition && (
        <AddRecordModal
          isOpen
          onClose={closeAddModal}
          title={activeDefinition.title}
          fields={withClient(activeDefinition.fields, selectedClient)}
          onSave={data => activeDefinition.fileKey === "misc"
            ? saveMiscNote(data)
            : saveRecord(activeDefinition.fileKey, data)}
          actionButton={activeDefinition.fileKey === "websites" ? {
            label: "Autopopulate",
            disabled: !whoisAvailable,
            disabledReason: "Requires whois.exe (winget install Microsoft.Sysinternals.Whois)",
            onClick: runWhoisLookup,
          } : undefined}
        />
      )}
    </>
  );
}
