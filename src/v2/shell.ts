import shell from 'shelljs';
import path from 'path';
import { getLibraryPath } from './runtime.ts';
import { checks, logfile } from '../utils.ts';

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
  return shell.cat(fullPath).stdout;
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
export function replaceFileContent(libraryName: string, relativePath: string, oldContent: string, newContent: string): void {
  const libraryPath = getLibraryPath(libraryName);
  const fullPath = path.join(libraryPath, relativePath);
  checks(shell.test('-f', fullPath), `File not found: ${fullPath}`);

  // shell.sed is tricky with multi-line and special characters.
  // A safer method is to read, replace in memory, and write back.
  const originalFileContent = shell.cat(fullPath).stdout;
  const updatedContent = originalFileContent.replace(oldContent, newContent);

  checks(originalFileContent !== updatedContent, `'oldContent' not found in file ${fullPath}. Replacement failed.`);

  new shell.ShellString(updatedContent).to(fullPath);
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
