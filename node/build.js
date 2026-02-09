import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
    entryPoints: ["src/main.js"],
    outfile: "dist/main.js",
    bundle: true,
    minify: true,
    platform: "node",
    target: "node20",
    format: "esm",
    sourcemap: false,
    banner: {
        js: "#!/usr/bin/env node",
    },
    logLevel: "info",
});

console.log("✅ Build complete: dist/main.js");
