import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

async function collectTsEntries(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
        entries.map(async (entry) => {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
                return collectTsEntries(fullPath);
            }
            if (entry.isFile() && fullPath.endsWith(".ts")) {
                return [fullPath];
            }
            return [];
        }),
    );

    return files.flat();
}

const shared = {
    minify: true,
    sourcemap: true,
    format: "esm",
    target: "es2022",
    packages: "external", // peerDependencies (react, @noble/*) 외부 처리
};

const sourceEntries = await collectTsEntries("src");

await build({
    ...shared,
    bundle: false,
    platform: "neutral",
    entryPoints: sourceEntries,
    outbase: "src",
    outdir: "dist",
});

// 코어 클라이언트: browser/Node.js 양쪽에서 동작하도록 neutral 플랫폼 사용
await build({
    ...shared,
    bundle: true,
    platform: "neutral",
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
});

await build({
    ...shared,
    bundle: true,
    platform: "neutral",
    entryPoints: ["src/packet.ts"],
    outfile: "dist/packet.js",
});

// React 훅: 브라우저 전용
await build({
    ...shared,
    bundle: true,
    platform: "browser",
    entryPoints: ["src/react.ts"],
    outfile: "dist/react.js",
    external: ["react", "react-dom"],
});

console.log("Build complete.");
