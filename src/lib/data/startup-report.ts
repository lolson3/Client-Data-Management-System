/**
 * Prints the data-source precheck report to the server terminal.
 * Node-only (uses process.stdout) — loaded via dynamic import from
 * src/instrumentation.ts so it never enters the edge-runtime bundle.
 */

import { checkDataSources } from "./registry";
import { assertProductionAuthConfiguration } from "@/lib/auth/config";

export async function logDataSourceReport(): Promise<void> {
  assertProductionAuthConfiguration();
  const useColor = process.stdout.isTTY || process.env.FORCE_COLOR === "1";
  const green = (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s);
  const red = (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s);
  const dim = (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s);

  console.log("\nData source precheck:");
  try {
    const sources = await checkDataSources();
    const keyWidth = Math.max(...sources.map((s) => s.key.length));

    for (const s of sources) {
      const mark = s.ok ? green("✓") : red("✗");
      const name = s.key.padEnd(keyWidth);
      const count = s.rows !== undefined ? ` (${s.rows} rows)` : "";
      const problem = s.ok ? "" : `  ${red(s.error || "unavailable")}`;
      console.log(
        `  ${mark} ${name}  ${dim(`[${s.type}:${s.container}]`)} ${s.location}${count}${problem}`
      );
    }

    const okCount = sources.filter((s) => s.ok).length;
    const missing = sources.filter((s) => !s.ok);
    const summary = `${okCount}/${sources.length} data sources OK`;
    if (missing.length > 0) {
      console.log(
        red(`  ${summary} — ${missing.length} UNAVAILABLE: ${missing.map((s) => s.key).join(", ")}`)
      );
    } else {
      console.log(green(`  ${summary}`));
    }
    console.log("");
  } catch (error) {
    console.error("  Data source precheck failed:", error);
  }
}
