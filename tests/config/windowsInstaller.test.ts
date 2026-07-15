import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const TAURI_CONFIG_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "src-tauri",
  "tauri.conf.json",
);
const tauriConfig = JSON.parse(fs.readFileSync(TAURI_CONFIG_PATH, "utf8"));
const installerHooksPath = path.resolve(
  path.dirname(TAURI_CONFIG_PATH),
  tauriConfig.bundle.windows.nsis.installerHooks,
);
const installerHooks = fs.readFileSync(installerHooksPath, "utf8");

describe("Windows NSIS application-data cleanup", () => {
  it("loads the custom uninstall hooks from the Tauri bundle config", () => {
    expect(tauriConfig.bundle.windows.nsis.installerHooks).toBe(
      "windows/nsis-hooks.nsh",
    );
  });

  it("deletes the 302 data directory only for an explicit full uninstall", () => {
    expect(installerHooks).toContain("NSIS_HOOK_POSTUNINSTALL");
    expect(installerHooks).toContain("$DeleteAppDataCheckboxState = 1");
    expect(installerHooks).toContain("$UpdateMode <> 1");
    expect(installerHooks).toContain('RMDir /r "$PROFILE\\.302-cc-switch"');
    expect(installerHooks).not.toContain('RMDir /r "$PROFILE\\.cc-switch"');
  });
});
