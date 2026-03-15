import { build } from "esbuild";

const shared = {
    bundle: true,
    minify: true,
    sourcemap: true,
    format: "esm",
    target: "es2022",
    packages: "external", // peerDependencies (react, @noble/*) 외부 처리
};

// 코어 클라이언트: browser/Node.js 양쪽에서 동작하도록 neutral 플랫폼 사용
await build({
    ...shared,
    platform: "neutral",
    entryPoints: ["src/index.ts"],
    outfile: "dist/index.js",
});

await build({
    ...shared,
    platform: "neutral",
    entryPoints: ["src/packet.ts"],
    outfile: "dist/packet.js",
});

// React 훅: 브라우저 전용
await build({
    ...shared,
    platform: "browser",
    entryPoints: ["src/react.ts"],
    outfile: "dist/react.js",
    external: ["react", "react-dom"],
});

console.log("Build complete.");
