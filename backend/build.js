const esbuild = require('esbuild');
const peggy = require('peggy');
const fs = require('fs');
const path = require('path');

// ============================================
// Step 1: 预编译 Peggy 语法文件
// ============================================
const PARSERS_DIR = path.join(__dirname, 'src/core/proxy-utils/parsers/peggy');
const GENERATED_DIR = path.join(PARSERS_DIR, 'generated');

// 确保输出目录存在
if (!fs.existsSync(GENERATED_DIR)) {
    fs.mkdirSync(GENERATED_DIR, { recursive: true });
}

// 获取所有 .peg 文件
const pegFiles = fs.readdirSync(PARSERS_DIR).filter(f => f.endsWith('.peg'));

console.log('🔧 Pre-compiling Peggy grammars...');

for (const pegFile of pegFiles) {
    const baseName = path.basename(pegFile, '.peg');
    const pegPath = path.join(PARSERS_DIR, pegFile);
    const outputPath = path.join(GENERATED_DIR, `${baseName}.js`);

    console.log(`   📄 Compiling ${pegFile}...`);

    // 读取 .peg 文件内容
    const grammar = fs.readFileSync(pegPath, 'utf-8');

    // 使用 peggy 编译成解析器源码
    const parserSource = peggy.generate(grammar, {
        output: 'source',
        format: 'es',
    });

    // 写入生成的解析器模块
    const moduleCode = `// Auto-generated from ${pegFile} - DO NOT EDIT
${parserSource}

let cachedParser = null;
export default function getParser() {
    if (!cachedParser) {
        cachedParser = peg$parse;
        cachedParser.parse = peg$parse;
    }
    return cachedParser;
}
`;

    fs.writeFileSync(outputPath, moduleCode, 'utf-8');
}

console.log(`✅ Generated ${pegFiles.length} parsers in ${GENERATED_DIR}`);

// ============================================
// Step 2: 创建 peggy 空模块 (用于替换运行时依赖)
// ============================================
const PEGGY_SHIM_PATH = path.join(GENERATED_DIR, 'peggy-shim.js');
fs.writeFileSync(PEGGY_SHIM_PATH, `// Peggy shim - parsers are pre-compiled, no runtime generation needed
export function generate() {
    throw new Error('Peggy runtime generation is disabled. Use pre-compiled parsers.');
}
export default { generate };
`, 'utf-8');

// ============================================
// Step 3: 创建 esbuild plugin 用于重定向解析器路径
// ============================================
const peggyRedirectPlugin = {
    name: 'peggy-redirect',
    setup(build) {
        // 重定向 ./peggy/xxx 到 ./peggy/generated/xxx
        build.onResolve({ filter: /\.\/peggy\/(surge|loon|qx|trojan-uri)$/ }, (args) => {
            const baseName = path.basename(args.path);
            const generatedPath = path.join(GENERATED_DIR, `${baseName}.js`);
            console.log(`   🔄 Redirecting ${args.path} -> generated/${baseName}.js`);
            return { path: generatedPath };
        });

        // 将 peggy 库替换为空 shim
        build.onResolve({ filter: /^peggy$/ }, () => {
            console.log('   🔄 Replacing peggy with shim');
            return { path: PEGGY_SHIM_PATH };
        });
    }
};

console.log('🔧 Plugin configured.');

// ============================================
// Step 4: 构建 ESM 版本
// ============================================
async function buildESM() {
    console.log('📦 Building ESM version...');
    await esbuild.build({
        entryPoints: ['src/core/proxy-utils/index.js'],
        outfile: 'dist/subconv.js',
        bundle: true,
        minify: true,
        platform: 'neutral',
        format: 'esm',           // ESM 格式
        target: 'es2020',
        mainFields: ['module', 'main'],
        plugins: [peggyRedirectPlugin],
        logLevel: 'info',
    });
    console.log('✅ ESM bundle generated: dist/subconv.js');
}

// ============================================
// Step 5: 生成类型定义
// ============================================
function generateTypes() {
    const dtsPath = path.join(__dirname, 'dist', 'subconv.d.ts');
    const dts = `// ESM 导出
export declare const ProxyUtils: {
  parse(raw: string): any[];
  produce(
    proxies: any[],
    targetPlatform: string,
    type?: string,
    opts?: Record<string, any>,
  ): string;
  convert(raw: string, target: string): string;
};
`;
    fs.mkdirSync(path.dirname(dtsPath), { recursive: true });
    fs.writeFileSync(dtsPath, dts, 'utf-8');
    console.log(`🧩 Types generated: ${dtsPath}`);
}

// ============================================
// 执行构建
// ============================================
(async () => {
    try {
        await buildESM();
        generateTypes();
        console.log('');
        console.log('⚡ Build complete! ⚡');
        console.log('  📄 dist/subconv.js      - ESM');
        console.log('  📄 dist/subconv.d.ts    - TypeScript types');
    } catch (err) {
        console.error('Build failed:', err);
        process.exit(1);
    }
})();
