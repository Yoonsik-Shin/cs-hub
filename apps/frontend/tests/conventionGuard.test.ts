import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import test from 'node:test';

const sourceRoot = new URL('../src', import.meta.url).pathname;

function sourceFiles(directory = sourceRoot): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });
}

function violations(pattern: RegExp, allowedFiles: string[] = []): string[] {
  return sourceFiles().flatMap((path) => {
    const sourcePath = relative(sourceRoot, path);
    if (allowedFiles.includes(sourcePath)) return [];

    return readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) => pattern.test(line) ? [`${sourcePath}:${index + 1}`] : []);
  });
}

test('routes every HTTP request through the shared client', () => {
  assert.deepEqual(violations(/\bfetch\s*\(/, ['api/httpClient.ts']), []);
});

test('does not use blocking browser dialogs', () => {
  assert.deepEqual(violations(/(?:window\.)?(?:alert|prompt|confirm)\s*\(/), []);
});

test('routes standard modal overlays through ModalSurface', () => {
  assert.deepEqual(violations(/['"]modal-overlay['"]/, ['components/ui/ModalSurface.tsx']), []);
});
