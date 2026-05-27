import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const docsDir = path.resolve(rootDir, 'docs');
const publicDir = path.resolve(rootDir, 'public');
const outputDir = path.resolve(rootDir, 'docs-dist');
const docsifyReservedFiles = new Set([
  '_404.md',
  '_coverpage.md',
  '_navbar.md',
  '_sidebar.md'
]);

function toPosixPath(filePath) {
  return path.relative(rootDir, filePath).split(path.sep).join('/');
}

function isArchivedEntry(name) {
  return name.startsWith('_') && !docsifyReservedFiles.has(name);
}

function copyDirectory(sourceDir, targetDir, options = {}) {
  const { skipArchivedEntries = false } = options;

  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (skipArchivedEntries && isArchivedEntry(entry.name)) {
      console.log(`Skipped archived entry: ${toPosixPath(sourcePath)}`);
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath, options);
      continue;
    }

    if (entry.isFile()) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
      continue;
    }

    if (statSync(sourcePath).isFile()) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }
  }
}

rmSync(outputDir, { recursive: true, force: true });
copyDirectory(docsDir, outputDir, { skipArchivedEntries: true });

if (existsSync(publicDir)) {
  copyDirectory(publicDir, outputDir);
  console.log(`Synced ${toPosixPath(publicDir)} to ${toPosixPath(outputDir)}`);
}

console.log(`Prepared ${toPosixPath(outputDir)}`);
