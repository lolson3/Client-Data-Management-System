// Master data types

export interface Company {
  "Company Name": string;
  Abbrv: string;
  Group: string;
  Status: number;
}

// Core infrastructure
export interface CoreInfrastructure {
  Client: string;
  SubName: string;
  Name: string;
  "IP address": string;
  "Machine Name / MAC": string;
  "Service Tag": string;
  Description: string;
  Login: string;
  Password: string;
  "Alt Login": string;
  "Alt Passwd": string;
  Notes: string;
  "Notes 2": string;
  "On Landing Page": number;
  Grouping: string;
  "Asset ID": string;
  Cores?: number;
  "Ram (GB)"?: number;
  Inactive?: number;
  "RDP?"?: number;
  "VNC?"?: number;
  "SSH?"?: number;
  "Web?"?: number;
  "AD Server"?: number;
}

// User accounts
export interface User {
  Client: string;
  SubName: string;
  "Computer Name": string;
  Name: string;
  Login: string;
  Password: string;
  Phone: string;
  Cell: string;
  Notes: string;
  "Notes 2": string;
  "Epicor Number": string;
  Active: number;
  Grouping: string;
}

// Workstations
export interface Workstation {
  Client: string;
  "Computer Name": string;
  "IP Address": string;
  "Service Tag": string;
  Description: string;
  Upstream: string;
  Notes: string;
  "Notes 2": string;
  "On Landing Page": number;
  Active: number;
  Grouping: string;
  "Asset ID": string;
  CPU: string;
  "Win11 Capable": number;
}

// Phone numbers
export interface PhoneNumber {
  Client: string;
  Name: string;
  Number: string;
  Other: string;
}

// Email accounts
export interface Email {
  Client: string;
  Username: string;
  Email: string;
  Name: string;
  Password: string;
  Notes: string;
  "MFA or Ignore": number;
  Active: number;
  OWA_override: string;
  IMAP_override: string;
  POP_override: string;
  SMTP_override: string;
}

// External connections
export interface ExternalInfo {
  Client: string;
  SubName: string;
  "Connection Type": string;
  "Device Type": string;
  "IP address": string;
  Port: number;
  Username: string;
  Password: string;
  Notes: string;
  "VPN Port": number;
  "VPN Username": string;
  "VPN Password": string;
  "VPN Domain": string;
  DHCP: number;
  "On Landing Page": number;
  "Notes 2": string;
  "Current Version": string;
  "Last Reached Out To For Frimware Upgrade": string;
  Order: number;
  Grouping: string;
  "Asset ID": string;
}

// Points of Contact (ISP/provider contacts)
export interface ManagedInfo {
  Client: string;
  Provider: string;
  Name: string;
  Email: string;
  "IP 1": string;
  "IP 2": string;
  Managed: number;
  "Phone 1": string;
  "Phone 2": string;
  "Phone 3": string;
  "Phone 4": string;
  "Account #": string;
  Type: string;
  "Note 1": string;
  "Note 2": string;
  Active: number;
}

// Admin credentials
export interface AdminEmail {
  Client: string;
  Name: string;
  Email: string;
  Password: string;
  Notes: string;
  Automate: number;
}

export interface AdminVoipLogin {
  Client: string;
  Provider: string;
  Login: string;
  Password: string;
}

export interface AcronisBackup {
  "Acronis Cyber Cloud ": string; // Note: field has trailing space in Excel
  Client: string;
  UserName: string;
  PW: string;
  "Encrypt PW": string;
  "Encrypt PW2": string;
  "Encrypt PW3": string;
  "Encrypt PW4": string;
  "Encrypt PW 5": string;
  "Encrypt PW 6": string;
  "Encrypt PW 7": string;
}

export interface CloudflareAdmin {
  Client: string;
  username: string;
  pass: string;
}

export interface GuacamoleHost {
  Client: string;
  "Cloud Name": string;
  IP?: string;
  "Hard Coded IP"?: string;
  "Admin username"?: string;
  Password?: string;
  Notes?: string;
}

// Devices
export interface Device {
  Client: string;
  Name: string;
  "IP address": string;
  "Machine Name / MAC": string;
  "Service Tag": string;
  Login: string;
  Password: string;
  Note: string;
  "Note 1": string;
  "Note 2": string;
  "Note 3": string;
  Grouping: string;
  "Asset ID": string;
}

// Containers
export interface Container {
  Client: string;
  Name: string;
  IP: string;
  Port: number;
  Grouping: string;
  "Startup Notes"?: string;
}

// Virtual Machines
export interface VirtualMachine {
  Client: string;
  Location: string;
  Name: string;
  IP: string;
  Type: string;
  Host: string;
  "Startup memory (GB)": number;
  "Assigned cores": string;
  "Assigned To": string;
  Notes: string;
  Grouping: string;
  Active: number;
  "Windows 11 Issue?": string;
  "Needs W11": string;
  "Startup Notes"?: string;
}

// Daemons (self-contained application servers)
export interface Daemon {
  Client: string;
  Location: string;
  Name: string;
  IP: string;
  Host: string;
  User: string;
  Notes: string;
  Inactive: number;
  "Startup Notes"?: string;
}

// Services
export interface Service {
  Client: string;
  Service: string;
  Username: string;
  Password: string;
  "Date of last known change": number;
  "Host / URL": string;
  Notes: string;
}

// Domains
export interface Domain {
  Client: string;
  "Domain Name": string;
  "Alt Domain": string;
}

// Cameras
export interface Camera {
  Client: string;
  Name: string;
  Vendor: string;
  Model: string;
  IP: string;
  "Howto Connect": string;
  Login: string;
  Password: string;
  Notes: string;
  "Notes 2": string;
  "Host NVR": string;
}

// Websites / DNS
export interface Website {
  Client: string;
  "Registrar": string;
  "Registrar Credential Location": string;
  "Registrar Username": string;
  "Registrar Password": string;
  "DNS Host": string;
  "DNS Server Credential Location": string;
  "DNS Username": string;
  "DNS Password": string;
  "Website Host": string;
  "Website Credential Location": string;
  "Website Username": string;
  "Website Password": string;
  URL: string;
  Notes: string;
  "Is Inactive"?: number;
}

// Combined data types for views
export interface WorkstationUserFusion extends Workstation {
  UserName?: string;
  UserLogin?: string;
  UserPhone?: string;
  UserCell?: string;
}

// API response types
export interface DataResponse<T> {
  data: T[];
  error?: string;
}

// Filter types
export interface DataFilters {
  client?: string;
  active?: boolean;
  search?: string;
  grouping?: string;
  subName?: string;
}
