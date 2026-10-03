import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const clientRoot = fileURLToPath(new URL("../", import.meta.url));
await build({
  absWorkingDir: clientRoot,
  entryPoints: ["src/App.jsx"],
  outfile: "node_modules/.cache/ecoscan/App.mjs",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  jsx: "automatic",
  define: { "import.meta.env.VITE_API_URL": '""' }
});

const result = spawnSync(process.execPath, ["--test", "test/App.test.mjs"], {
  cwd: clientRoot,
  stdio: "inherit"
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
