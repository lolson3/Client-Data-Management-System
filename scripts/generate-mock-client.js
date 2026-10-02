const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const outputDir = path.join(__dirname, "..", "Examples");
const client = "NOVA";

const mock = (label) => `MOCK_ONLY_${label}`;

const datasets = [
  ["companies.xlsx", "Companies", [
    { "Company Name": "Nova Harbor Design Studio", Abbrv: client, Group: "Mock Clients", Status: 0 },
  ]],
  ["Core.xlsx", "Infrastructure", [
    { Client: client, SubName: "Headquarters", Name: "NOVA-DC01", "Device Type": "Server", "IP address": "192.0.2.10", "Machine Name / MAC": "NOVA-DC01 / 02:00:00:00:00:10", "Service Tag": "MOCKDC1", Description: "Primary Active Directory and file server", Login: "NOVA/Administrator", Password: mock("DC_ADMIN_PASSWORD"), "Alt Login": "NOVA/mock-breakglass", "Alt Passwd": mock("BREAKGLASS_PASSWORD"), Notes: "Fictional server for UI design and testing", "Notes 2": "Nightly mock backup at 23:00", "On Landing Page": 1, Grouping: "Servers", "Asset ID": "NOVA-SRV-001", Cores: 8, "Ram (GB)": 32, Inactive: 0, "RDP?": 1, "VNC?": 0, "SSH?": 0, "Web?": 1, "AD Server": 1 },
    { Client: client, SubName: "Headquarters", Name: "NOVA-SW01", "Device Type": "Switch", "IP address": "192.0.2.2", "Machine Name / MAC": "NOVA-SW01 / 02:00:00:00:00:02", "Service Tag": "MOCKSW1", Description: "48-port managed access switch", Login: "mock-netadmin", Password: mock("SWITCH_PASSWORD"), "Alt Login": "mock-readonly", "Alt Passwd": mock("SWITCH_READONLY"), Notes: "Core office switch", "Notes 2": "Configuration archived monthly", "On Landing Page": 1, Grouping: "Network", "Asset ID": "NOVA-NET-001", Cores: 4, "Ram (GB)": 8, Inactive: 0, "RDP?": 0, "VNC?": 0, "SSH?": 1, "Web?": 1, "AD Server": 0 },
    { Client: client, SubName: "Headquarters", Name: "NOVA-RTR-01", "Device Type": "Router", "IP address": "192.0.2.1", "Machine Name / MAC": "NOVA-RTR-01 / 02:00:00:00:00:01", "Service Tag": "MOCKRTR01", Description: "Primary office edge router", Login: "mock-netadmin", Password: mock("ROUTER_PASSWORD"), "Alt Login": "mock-readonly", "Alt Passwd": mock("ROUTER_READONLY"), Notes: "Routes headquarters VLANs", "Notes 2": "Mock configuration backup enabled", "On Landing Page": 1, Grouping: "Routers", "Asset ID": "NOVA-NET-002", Cores: 4, "Ram (GB)": 4, Inactive: 0, "RDP?": 0, "VNC?": 0, "SSH?": 1, "Web?": 1, "AD Server": 0 },
    { Client: client, SubName: "Production Studio", Name: "NOVA-RTR-02", "Device Type": "Router", "IP address": "192.0.2.65", "Machine Name / MAC": "NOVA-RTR-02 / 02:00:00:00:00:65", "Service Tag": "MOCKRTR02", Description: "Production studio branch router", Login: "mock-netadmin", Password: mock("ROUTER_PASSWORD"), "Alt Login": "mock-readonly", "Alt Passwd": mock("ROUTER_READONLY"), Notes: "Fictional site-to-site connection", "Notes 2": "LTE failover simulated", "On Landing Page": 1, Grouping: "Routers", "Asset ID": "NOVA-NET-003", Cores: 2, "Ram (GB)": 2, Inactive: 0, "RDP?": 0, "VNC?": 0, "SSH?": 1, "Web?": 1, "AD Server": 0 },
    { Client: client, SubName: "Headquarters", Name: "NOVA-SW02", "Device Type": "Switch", "IP address": "192.0.2.3", "Machine Name / MAC": "NOVA-SW02 / 02:00:00:00:00:03", "Service Tag": "MOCKSW02", Description: "24-port managed studio switch", Login: "mock-netadmin", Password: mock("SWITCH_PASSWORD"), "Alt Login": "mock-readonly", "Alt Passwd": mock("SWITCH_READONLY"), Notes: "Serves design workstations", "Notes 2": "PoE enabled on ports 1-12", "On Landing Page": 1, Grouping: "Switches", "Asset ID": "NOVA-NET-004", Cores: 2, "Ram (GB)": 4, Inactive: 0, "RDP?": 0, "VNC?": 0, "SSH?": 1, "Web?": 1, "AD Server": 0 },
    { Client: client, SubName: "Production Studio", Name: "NOVA-SW03", "Device Type": "Switch", "IP address": "192.0.2.66", "Machine Name / MAC": "NOVA-SW03 / 02:00:00:00:00:66", "Service Tag": "MOCKSW03", Description: "16-port production access switch", Login: "mock-netadmin", Password: mock("SWITCH_PASSWORD"), "Alt Login": "mock-readonly", "Alt Passwd": mock("SWITCH_READONLY"), Notes: "Uplink to NOVA-RTR-02", "Notes 2": "Mock VLANs for production equipment", "On Landing Page": 1, Grouping: "Switches", "Asset ID": "NOVA-NET-005", Cores: 2, "Ram (GB)": 2, Inactive: 0, "RDP?": 0, "VNC?": 0, "SSH?": 1, "Web?": 1, "AD Server": 0 },
  ]],
  ["Users.xlsx", "Users", [
    { Client: client, SubName: "Headquarters", "Computer Name": "NOVA-LT-001", Name: "Avery Morgan", Login: "avery.morgan", Password: mock("AVERY_PASSWORD"), Phone: "+1-202-555-0101", Cell: "+1-202-555-0111", Notes: "Creative director; remote access enabled", "Notes 2": "Mock onboarding completed", "Epicor Number": "MOCK-E1001", Active: 1, Grouping: "Design" },
    { Client: client, SubName: "Headquarters", "Computer Name": "NOVA-WS-002", Name: "Jordan Lee", Login: "jordan.lee", Password: mock("JORDAN_PASSWORD"), Phone: "+1-202-555-0102", Cell: "+1-202-555-0112", Notes: "Operations manager", "Notes 2": "Requires accounting share", "Epicor Number": "MOCK-E1002", Active: 1, Grouping: "Operations" },
  ]],
  ["Workstations.xlsx", "Workstations", [
    { Client: client, "Computer Name": "NOVA-LT-001", "Device Type": "Laptop", "IP Address": "192.0.2.101", "Service Tag": "MOCKLT1", Description: "Design laptop", Upstream: "NOVA-SW01", Notes: "Adobe mock suite installed", "Notes 2": "USB-C dock at desk 14", "On Landing Page": 1, Active: 1, Grouping: "Laptops", "Asset ID": "NOVA-PC-001", CPU: "Intel Core Ultra 7 (mock)", "Win11 Capable": 1 },
    { Client: client, "Computer Name": "NOVA-WS-002", "Device Type": "Desktop", "IP Address": "192.0.2.102", "Service Tag": "MOCKWS2", Description: "Operations workstation", Upstream: "NOVA-SW01", Notes: "Dual display setup", "Notes 2": "Accounting app test profile", "On Landing Page": 0, Active: 1, Grouping: "Desktops", "Asset ID": "NOVA-PC-002", CPU: "AMD Ryzen 7 (mock)", "Win11 Capable": 1 },
    { Client: client, "Computer Name": "NOVA-WS-003", "Device Type": "Desktop", "IP Address": "192.0.2.103", "Service Tag": "MOCKWS3", Description: "Senior designer workstation", Upstream: "NOVA-SW02", Notes: "Mock graphics workstation", "Notes 2": "Calibrated dual displays", "On Landing Page": 1, Active: 1, Grouping: "Desktops", "Asset ID": "NOVA-PC-003", CPU: "Intel Core i9 (mock)", "Win11 Capable": 1 },
    { Client: client, "Computer Name": "NOVA-LT-004", "Device Type": "Laptop", "IP Address": "192.0.2.104", "Service Tag": "MOCKLT4", Description: "Project manager laptop", Upstream: "NOVA-SW02", Notes: "Hybrid work mock profile", "Notes 2": "USB-C travel dock assigned", "On Landing Page": 0, Active: 1, Grouping: "Laptops", "Asset ID": "NOVA-PC-004", CPU: "Intel Core Ultra 5 (mock)", "Win11 Capable": 1 },
    { Client: client, "Computer Name": "NOVA-WS-005", "Device Type": "Desktop", "IP Address": "192.0.2.105", "Service Tag": "MOCKWS5", Description: "Production control workstation", Upstream: "NOVA-SW03", Notes: "Located in production studio", "Notes 2": "Mock print queue management tools", "On Landing Page": 1, Active: 1, Grouping: "Desktops", "Asset ID": "NOVA-PC-005", CPU: "AMD Ryzen 5 (mock)", "Win11 Capable": 1 },
  ]],
  ["Phone Numbers.xlsx", "Sheet1", [
    { Client: client, Name: "Main Office", Number: "+1-202-555-0100", Other: "Fictional reception line" },
    { Client: client, Name: "After-hours Support", Number: "+1-202-555-0199", Other: "Routes to mock on-call queue" },
  ]],
  ["Emails.xlsx", "Email Addresses", [
    { Client: client, Username: "avery.morgan", Email: "avery.morgan@example.com", Name: "Avery Morgan", Password: mock("MAIL_AVERY_PASSWORD"), Notes: "Example mailbox with MFA enabled", "MFA or Ignore": 1, Active: 1, OWA_override: "https://mail.example.com/owa", IMAP_override: "imap.example.com:993", POP_override: "pop.example.com:995", SMTP_override: "smtp.example.com:587" },
    { Client: client, Username: "studio", Email: "studio@example.com", Name: "Nova Harbor Shared Studio", Password: mock("MAIL_SHARED_PASSWORD"), Notes: "Fictional shared mailbox", "MFA or Ignore": 0, Active: 1, OWA_override: "https://mail.example.com/owa", IMAP_override: "imap.example.com:993", POP_override: "Disabled", SMTP_override: "smtp.example.com:587" },
  ]],
  ["External_Info.xlsx", "External Info", [
    { Client: client, SubName: "Headquarters", "Connection Type": "Fiber", "Device Type": "Firewall", "IP address": "198.51.100.10", Port: 443, Username: "mock-firewall-admin", Password: mock("FIREWALL_PASSWORD"), Notes: "Reserved example public IP; not routable", "VPN Port": 4433, "VPN Username": "mock-vpn-user", "VPN Password": mock("VPN_PASSWORD"), "VPN Domain": "vpn.example.com", DHCP: 0, "On Landing Page": 1, "Notes 2": "Mock HA peer at 198.51.100.11", "Current Version": "MockOS 12.4.1", "Last Reached Out To For Frimware Upgrade": "2026-08-01 - mock vendor ticket", Order: 1, Grouping: "Edge Network", "Asset ID": "NOVA-FW-001" },
  ]],
  ["Managed_Info.xlsx", "Sheet1", [
    { Client: client, Provider: "Example Fiber Co.", Name: "Casey Rivera", Email: "casey.rivera@example.com", "IP 1": "198.51.100.10", "IP 2": "198.51.100.11", Managed: 1, "Phone 1": "+1-202-555-0120", "Phone 2": "+1-202-555-0121", "Phone 3": "+1-202-555-0122", "Phone 4": "+1-202-555-0123", "Account #": "MOCK-ISP-88421", Type: "Business Fiber", "Note 1": "Fictional ISP escalation contact", "Note 2": "Mock circuit ID: NOVA-HQ-01", Active: 1 },
  ]],
  ["Admin Emails.xlsx", "Admin Emails", [
    { Client: client, Name: "Microsoft 365 Mock Admin", Email: "m365-admin@example.com", Password: mock("M365_ADMIN_PASSWORD"), Notes: "Nonfunctional example account", Automate: 1 },
  ]],
  ["Admin VOIP Logins.xlsx", "Mitel Admins", [
    { Client: client, Provider: "Example Voice Cloud", Login: "nova-voip-admin", Password: mock("VOIP_ADMIN_PASSWORD") },
  ]],
  ["Acronis Backups.xlsx", "Sheet1", [
    { "Acronis Cyber Cloud ": "https://backup.example.com/tenant/nova", Client: client, UserName: "nova-backup-admin", PW: mock("ACRONIS_PASSWORD"), "Encrypt PW": mock("ENCRYPTION_1"), "Encrypt PW2": mock("ENCRYPTION_2"), "Encrypt PW3": mock("ENCRYPTION_3"), "Encrypt PW4": mock("ENCRYPTION_4"), "Encrypt PW 5": mock("ENCRYPTION_5"), "Encrypt PW 6": mock("ENCRYPTION_6"), "Encrypt PW 7": mock("ENCRYPTION_7") },
  ]],
  ["Cloudflare_Admins.xlsx", "CF Admins", [
    { Client: client, username: "dns-admin@example.com", pass: mock("CLOUDFLARE_PASSWORD") },
  ]],
  ["GuacamoleHosts.xlsx", "Sheet1", [
    { Client: client, "Cloud Name": "NOVA Remote Desktop Gateway", IP: "192.0.2.20", "Hard Coded IP": "198.51.100.20", "Admin username": "mock-guac-admin", Password: mock("GUACAMOLE_PASSWORD"), Notes: "Fictional remote access gateway" },
  ]],
  ["Devices.xlsx", "Devices", [
    { Client: client, Name: "NOVA-MFP-01", "Device Type": "Printer", "IP address": "192.0.2.150", "Machine Name / MAC": "NOVA-MFP-01 / 02:00:00:00:01:50", "Service Tag": "MOCKMFP01", Login: "mock-printer-admin", Password: mock("PRINTER_PASSWORD"), Note: "Color multifunction printer", "Note 1": "Second floor design area", "Note 2": "Mock toner contract 4421", "Note 3": "Scan-to-email configured", Grouping: "Printers", "Asset ID": "NOVA-DEV-001" },
    { Client: client, Name: "NOVA-MFP-02", "Device Type": "Printer", "IP address": "192.0.2.151", "Machine Name / MAC": "NOVA-MFP-02 / 02:00:00:00:01:51", "Service Tag": "MOCKMFP02", Login: "mock-printer-admin", Password: mock("PRINTER_PASSWORD"), Note: "Monochrome multifunction printer", "Note 1": "First floor operations area", "Note 2": "Default duplex printing", "Note 3": "Secure print enabled", Grouping: "Printers", "Asset ID": "NOVA-DEV-002" },
    { Client: client, Name: "NOVA-PRN-03", "Device Type": "Printer", "IP address": "192.0.2.152", "Machine Name / MAC": "NOVA-PRN-03 / 02:00:00:00:01:52", "Service Tag": "MOCKPRN03", Login: "mock-printer-admin", Password: mock("PRINTER_PASSWORD"), Note: "Wide-format design printer", "Note 1": "Production studio", "Note 2": "36-inch roll feed", "Note 3": "Fictional plotter queue", Grouping: "Printers", "Asset ID": "NOVA-DEV-003" },
    { Client: client, Name: "NOVA-LBL-01", "Device Type": "Label Printer", "IP address": "192.0.2.153", "Machine Name / MAC": "NOVA-LBL-01 / 02:00:00:00:01:53", "Service Tag": "MOCKLBL01", Login: "mock-label-admin", Password: mock("LABEL_PRINTER_PASSWORD"), Note: "Shipping label printer", "Note 1": "Reception and shipping desk", "Note 2": "4-inch thermal labels", "Note 3": "Mock inventory labels", Grouping: "Printers", "Asset ID": "NOVA-DEV-004" },
    { Client: client, Name: "NOVA-SCN-01", "Device Type": "Scanner", "IP address": "192.0.2.154", "Machine Name / MAC": "NOVA-SCN-01 / 02:00:00:00:01:54", "Service Tag": "MOCKSCN01", Login: "mock-scanner-admin", Password: mock("SCANNER_PASSWORD"), Note: "High-speed document scanner", "Note 1": "Records room", "Note 2": "Scan-to-network workflow", "Note 3": "Duplex feeder configured", Grouping: "Scanners", "Asset ID": "NOVA-DEV-005" },
    { Client: client, Name: "NOVA-SCN-02", "Device Type": "Scanner", "IP address": "192.0.2.155", "Machine Name / MAC": "NOVA-SCN-02 / 02:00:00:00:01:55", "Service Tag": "MOCKSCN02", Login: "mock-scanner-admin", Password: mock("SCANNER_PASSWORD"), Note: "Flatbed photo scanner", "Note 1": "Creative archive", "Note 2": "Color calibration profile installed", "Note 3": "USB-over-network adapter", Grouping: "Scanners", "Asset ID": "NOVA-DEV-006" },
    { Client: client, Name: "NOVA-SCN-03", "Device Type": "Document Scanner", "IP address": "192.0.2.156", "Machine Name / MAC": "NOVA-SCN-03 / 02:00:00:00:01:56", "Service Tag": "MOCKSCN03", Login: "mock-scanner-admin", Password: mock("SCANNER_PASSWORD"), Note: "Desktop document scanner", "Note 1": "Accounting office", "Note 2": "OCR profile enabled", "Note 3": "Invoices route to mock share", Grouping: "Scanners", "Asset ID": "NOVA-DEV-007" },
    { Client: client, Name: "NOVA-SCN-04", "Device Type": "Scanner", "IP address": "192.0.2.157", "Machine Name / MAC": "NOVA-SCN-04 / 02:00:00:00:01:57", "Service Tag": "MOCKSCN04", Login: "mock-scanner-admin", Password: mock("SCANNER_PASSWORD"), Note: "Large-format artwork scanner", "Note 1": "Production studio", "Note 2": "36-inch capture width", "Note 3": "Fictional color workflow", Grouping: "Scanners", "Asset ID": "NOVA-DEV-008" },
  ]],
  ["Containers.xlsx", "Containers", [
    { Client: client, Name: "nova-intranet", IP: "192.0.2.31", Port: 3000, Grouping: "Docker", "Startup Notes": "docker compose up -d; mock container only" },
    { Client: client, Name: "nova-monitoring", IP: "192.0.2.32", Port: 9090, Grouping: "Docker", "Startup Notes": "Start after NOVA-VM-APP01" },
  ]],
  ["VMs.xlsx", "Clients", [
    { Client: client, Location: "Headquarters", Name: "NOVA-VM-APP01", "Device Type": "Virtual Machine", IP: "192.0.2.21", Type: "Windows Server (mock)", Host: "NOVA-HV01", "Startup memory (GB)": 16, "Assigned cores": "4", "Assigned To": "Internal applications", Notes: "Fictional application VM", Grouping: "Production", Active: 1, "Windows 11 Issue?": "None - server workload", "Needs W11": "No", "Startup Notes": "Start after NOVA-DC01; wait 60 seconds" },
    { Client: client, Location: "Headquarters", Name: "NOVA-VM-WEB01", "Device Type": "Virtual Machine", IP: "192.0.2.22", Type: "Linux (mock)", Host: "NOVA-HV01", "Startup memory (GB)": 8, "Assigned cores": "2", "Assigned To": "Development preview", Notes: "Hosts mock preview services", Grouping: "Development", Active: 1, "Windows 11 Issue?": "N/A", "Needs W11": "No", "Startup Notes": "Start after network services" },
  ]],
  ["Daemons.xlsx", "Sheet1", [
    { Client: client, Location: "NOVA-VM-APP01", Name: "Mock Design Queue Processor", IP: "192.0.2.21", Host: "NOVA-VM-APP01", User: "svc_design_queue", Notes: "Processes fictional design-render jobs", Inactive: 0, "Startup Notes": "Start service after database health check" },
  ]],
  ["Services.xlsx", "Services", [
    { Client: client, Service: "Adobe Mock Licensing", Username: "licenses@example.com", Password: mock("ADOBE_LICENSE_PASSWORD"), "Date of last known change": 45870, "Host / URL": "https://licenses.example.com/nova", Notes: "Fictional SaaS credential; Excel date represents 2025-07-02" },
    { Client: client, Service: "Accounting Sandbox", Username: "nova-accounting-admin", Password: mock("ACCOUNTING_PASSWORD"), "Date of last known change": 46225, "Host / URL": "https://accounting.example.com/nova", Notes: "Mock finance application tenant" },
  ]],
  ["Domains.xlsx", "Sheet1", [
    { Client: client, "Domain Type": "Local Network", "Domain Name": "NOVA", "Admin Login": "NOVA/Administrator", Notes: "Active Directory domain for the Nova Harbor local network" },
    { Client: client, "Domain Type": "Web", "Domain Name": "nova-harbor.example.com", "Alt Domain": "novaharbor.example.net", Notes: "Reserved example domains used for mock web and email services" },
  ]],
  ["Cameras External.xlsx", "Cameras", [
    { Client: client, Name: "NOVA-CAM-LOBBY", "Device Type": "Camera", Vendor: "ExampleCam", Model: "EC-4K-MOCK", IP: "192.0.2.180", "Howto Connect": "https://192.0.2.180 (mock only)", Login: "mock-camera-admin", Password: mock("CAMERA_PASSWORD"), Notes: "Fictional lobby camera", "Notes 2": "Retention: 14 mock days", "Host NVR": "NOVA-NVR01" },
  ]],
  ["websites.xlsx", "Websites", [
    { Client: client, Registrar: "Example Registrar", "Registrar Credential Location": "Local", "Registrar Username": "nova-registrar-admin", "Registrar Password": mock("REGISTRAR_PASSWORD"), "DNS Host": "Example DNS", "DNS Server Credential Location": "Password Manager", "DNS Username": "nova-dns-admin", "DNS Password": mock("DNS_PASSWORD"), "Website Host": "Example Hosting", "Website Credential Location": "Client", "Website Username": "nova-web-admin", "Website Password": mock("WEBHOST_PASSWORD"), URL: "https://nova-harbor.example.com", Notes: "Reserved example domain; safe for UI testing", "Is Inactive": 0 },
  ]],
];

fs.mkdirSync(outputDir, { recursive: true });

for (const [fileName, sheetName, rows] of datasets) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, path.join(outputDir, fileName));
  console.log(`Created ${fileName} (${rows.length} row${rows.length === 1 ? "" : "s"})`);
}

const miscDir = path.join(outputDir, "Misc");
fs.mkdirSync(miscDir, { recursive: true });
const miscWorkbook = XLSX.utils.book_new();
const miscRows = [{
  Notes: "Nova Harbor is entirely fictional and exists only for frontend design.",
  "Notes 1": "Primary mock contact: Avery Morgan",
  "Notes 2": "Office hours: Monday-Friday, 08:30-17:30",
  "Notes 3": "Preferred contact method: example email",
  "Notes 4": "Mock maintenance window: Sunday 02:00-04:00",
  "Notes 5": "All IPs use documentation-only address ranges.",
  "Notes 6": "All passwords begin with MOCK_ONLY_ and are nonfunctional.",
  "Notes 7": "Asset review scheduled for 2026-10-15.",
  "Notes 8": "Frontend test note with enough text to exercise wrapping.",
  "Notes 9": "End of fictional client record.",
}];
XLSX.utils.book_append_sheet(miscWorkbook, XLSX.utils.json_to_sheet(miscRows), "Notes");
XLSX.writeFile(miscWorkbook, path.join(miscDir, `${client}.xlsx`));
console.log(`Created Misc/${client}.xlsx (1 row)`);
console.log(`Mock client ${client} is ready in ${outputDir}`);
