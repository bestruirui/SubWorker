const esbuild = require('esbuild');
const peggy = require('peggy');
const fs = require('node:fs');
const path = require('node:path');

const CLI_FLAGS = new Set(process.argv.slice(2));
const SHOULD_BUILD_BUNDLE = !CLI_FLAGS.has('--parsers-only');
const HELP_TEXT = `Usage: node scripts/build.js [--parsers-only]

--parsers-only   Only generate pre-compiled Peggy parsers.
Without --parsers-only, build the Node bundle from .build/src/node.js.`;

if (CLI_FLAGS.has('--help')) {
    console.log(HELP_TEXT);
    process.exit(0);
}

const PATHS = createPaths();

function createPaths() {
    const rootDir = path.resolve(__dirname, '..');
    const buildDir = path.join(rootDir, '.build');
    const buildSrcDir = path.join(buildDir, 'src');
    const buildParsersDir = path.join(buildSrcDir, 'core/proxy-utils/parsers');
    const buildPeggyDir = path.join(buildParsersDir, 'peggy');

    return {
        rootDir,
        srcDir: path.join(rootDir, 'src'),
        rootTsconfigPath: path.join(rootDir, 'jsconfig.json'),
        buildDir,
        buildSrcDir,
        buildTsconfigPath: path.join(buildDir, 'jsconfig.json'),
        buildPeggyDir,
        buildGeneratedDir: path.join(buildPeggyDir, 'generated'),
        buildParsersIndexPath: path.join(buildParsersDir, 'index.js'),
        nodeEntryPath: path.join(buildSrcDir, 'node.js'),
        nodeOutputPath: path.join(rootDir, 'dist/minisubconvert.js'),
    };
}

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function prepareBuildWorkspace() {
    fs.rmSync(PATHS.buildDir, { recursive: true, force: true });
    ensureDir(PATHS.buildDir);
    fs.cpSync(PATHS.srcDir, PATHS.buildSrcDir, { recursive: true });
    fs.copyFileSync(PATHS.rootTsconfigPath, PATHS.buildTsconfigPath);
}

/**
 * Get peggy source .js files that contain embedded grammars.
 * These files follow the pattern:
 *   import peggy from 'peggy';
 *   const grammars = String.raw`...`;
 *   ...
 *   peggy.generate(grammars);
 */
function getPeggySourceFiles() {
    const jsFiles = fs
        .readdirSync(PATHS.buildPeggyDir)
        .filter((fileName) => fileName.endsWith('.js'))
        .sort();

    if (jsFiles.length === 0) {
        throw new Error(
            `No .js files found in ${PATHS.buildPeggyDir}`,
        );
    }

    return jsFiles;
}

/**
 * Extract the grammar string from a peggy source .js file.
 * The grammar is embedded between String.raw` and the closing backtick.
 */
function extractGrammar(source) {
    const startMarker = 'String.raw`';
    const startIdx = source.indexOf(startMarker);
    if (startIdx === -1) {
        return null;
    }

    const grammarStart = startIdx + startMarker.length;

    // Find the closing backtick - need to handle escaped backticks
    let depth = 0;
    let i = grammarStart;
    while (i < source.length) {
        if (source[i] === '\\') {
            i += 2; // skip escaped char
            continue;
        }
        if (source[i] === '`') {
            if (depth === 0) {
                return source.substring(grammarStart, i);
            }
        }
        i++;
    }

    return null;
}

function createParserModuleCode(jsFileName, parserSource) {
    return [
        `// Auto-generated from ${jsFileName} - DO NOT EDIT`,
        parserSource,
        '',
        'let cachedParser = null;',
        'export default function getParser() {',
        '    if (!cachedParser) {',
        '        cachedParser = peg$parse;',
        '        cachedParser.parse = peg$parse;',
        '    }',
        '    return cachedParser;',
        '}',
        '',
    ].join('\n');
}

function compilePeggyFromSource(jsFileName) {
    const sourcePath = path.join(PATHS.buildPeggyDir, jsFileName);
    const baseName = path.parse(jsFileName).name;
    const outputPath = path.join(PATHS.buildGeneratedDir, `${baseName}.js`);

    const source = fs.readFileSync(sourcePath, 'utf-8');
    const grammar = extractGrammar(source);

    if (!grammar) {
        throw new Error(
            `Could not extract grammar from ${jsFileName}. ` +
            `Expected a String.raw\` template literal.`,
        );
    }

    const parserSource = peggy.generate(grammar, {
        output: 'source',
        format: 'es',
    });

    fs.writeFileSync(
        outputPath,
        createParserModuleCode(jsFileName, parserSource),
        'utf-8',
    );
    console.log(`  Generated: ${path.relative(PATHS.rootDir, outputPath)}`);
}

/**
 * Rewrite imports in parsers/index.js to point to pre-compiled generated modules
 * instead of the runtime-compiled peggy source files.
 *
 * Transforms:
 *   from './peggy/surge'  →  from './peggy/generated/surge'
 *   from './peggy/loon'   →  from './peggy/generated/loon'
 */
function rewriteParserIndexImports() {
    const PEGGY_IMPORT_RE =
        /(from\s+['"])\.\/peggy\/(?!generated\/)([^'"]+)(['"])/g;

    const source = fs.readFileSync(PATHS.buildParsersIndexPath, 'utf-8');
    const rewritten = source.replace(PEGGY_IMPORT_RE, '$1./peggy/generated/$2$3');

    if (rewritten !== source) {
        fs.writeFileSync(PATHS.buildParsersIndexPath, rewritten, 'utf-8');
        console.log(
            `  Rewired: ${path.relative(PATHS.rootDir, PATHS.buildParsersIndexPath)}`,
        );
    }
}

function compilePeggyParsers() {
    prepareBuildWorkspace();
    ensureDir(PATHS.buildGeneratedDir);

    const sourceFiles = getPeggySourceFiles();

    console.log('Pre-compiling Peggy grammars from embedded sources...');

    for (const jsFileName of sourceFiles) {
        compilePeggyFromSource(jsFileName);
    }

    rewriteParserIndexImports();
    console.log(`Generated ${sourceFiles.length} parser modules.`);
}

async function buildNodeBundle() {
    ensureDir(path.dirname(PATHS.nodeOutputPath));

    await esbuild.build({
        entryPoints: [PATHS.nodeEntryPath],
        outfile: PATHS.nodeOutputPath,
        bundle: true,
        minify: true,
        platform: 'node',
        format: 'cjs',
        target: 'node20',
        sourcemap: false,
        banner: {
            js: '#!/usr/bin/env node',
        },
        tsconfig: PATHS.buildTsconfigPath,
        logLevel: 'info',
    });

    console.log(
        `Node bundle generated: ${path.relative(PATHS.rootDir, PATHS.nodeOutputPath)}`,
    );
}

async function main() {
    try {
        compilePeggyParsers();

        if (SHOULD_BUILD_BUNDLE) {
            await buildNodeBundle();
        }

        console.log('Build complete.');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

main();
