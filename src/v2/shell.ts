import shell from 'shelljs';
import path from 'path';
import { getLibraryPath } from './runtime.ts';
import { checks, logfile } from '../utils.ts';

import fs from 'fs';

/**
 * Reads the full content of a file within a library.
 * @param libraryName The name of the library.
 * @param relativePath The path of the file relative to the library root.
 * @returns The content of the file as a string.
 */
export function readFileContent(libraryName: string, relativePath: string): string {
    const libraryPath = getLibraryPath(libraryName);
    const fullPath = path.join(libraryPath, relativePath);
    checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);
    logfile('shell', `Reading file: ${fullPath}`);
    return fs.readFileSync(fullPath, 'utf-8');
}

/**
 * Replaces a block of text in a file.
 * This is a simple implementation and might not be robust for all cases.
 * A more robust implementation would use context-based replacement.
 * @param libraryName The name of the library.
 * @param relativePath The path of the file relative to the library root.
 * @param oldContent The exact block of text to be replaced.
 * @param newContent The new block of text.
 */
export function replaceContent(libraryName: string, relativePath: string, oldContent: string, newContent: string): void {
    const libraryPath = getLibraryPath(libraryName);
    const fullPath = path.join(libraryPath, relativePath);
    checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);

    const originalFileContent = fs.readFileSync(fullPath, 'utf-8');
    const updatedContent = originalFileContent.replace(oldContent, newContent);

    checks(originalFileContent !== updatedContent, `'oldContent' not found in file ${fullPath}. Replacement failed.`);

    fs.writeFileSync(fullPath, updatedContent, 'utf-8');
    logfile('shell', `Replaced content in file: ${fullPath}`);
}

/**
 * Creates a new file with the given content.
 * @param libraryName The name of the library.
 * @param relativePath The path for the new file, relative to the library root.
 * @param content The content to write to the file.
 */
export function createFile(libraryName: string, relativePath: string, content: string): void {
    const libraryPath = getLibraryPath(libraryName);
    const fullPath = path.join(libraryPath, relativePath);
    checks(!shell.test('-e', fullPath), `File already exists: ${fullPath}`);
    new shell.ShellString(content).to(fullPath);
    logfile('shell', `Created file: ${fullPath}`);
}
