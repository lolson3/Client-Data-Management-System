const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(process.cwd(), ".env.local"), quiet: true });
dotenv.config({ path: path.join(process.cwd(), ".env"), quiet: true });

process.env.NODE_ENV ||= "production";
const jwtSecret = (process.env.JWT_SECRET || "").trim();
if (
  process.env.DISABLE_AUTH !== "true"
  && (jwtSecret.length < 32 || jwtSecret === "change-this-secret-in-production")
) {
  throw new Error("JWT_SECRET must be set to a non-default value of at least 32 characters before starting CDMS in production.");
}

process.env.PORT ||= "6030";
const projectRoot = process.cwd();
const standaloneRoot = path.join(projectRoot, ".next", "standalone");
const serverPath = path.join(standaloneRoot, "server.js");

if (!fs.existsSync(serverPath)) {
  throw new Error("Standalone build not found. Run `npm run build` first.");
}

// Next.js intentionally leaves these assets outside the standalone folder.
// Materialize them before starting so `npm start` serves a complete build.
const staticSource = path.join(projectRoot, ".next", "static");
const publicSource = path.join(projectRoot, "public");
if (fs.existsSync(staticSource)) {
  fs.cpSync(staticSource, path.join(standaloneRoot, ".next", "static"), { recursive: true, force: true });
}
if (fs.existsSync(publicSource)) {
  fs.cpSync(publicSource, path.join(standaloneRoot, "public"), { recursive: true, force: true });
}

require(serverPath);
