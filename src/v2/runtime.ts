import {checks, logfile} from '../utils.ts';
import path from "path";
import shell from 'shelljs';
import type {FileAbsolutePath, FolderAbsolutePath} from "../typings.ts";

// Define subdirectory names
export const ENTITIES_DIR = 'entities';
export const TRASH_DIR = 'trash';
export const BACKUPS_DIR = 'backups';
export const JOURNEYS_DIR = 'journeys';
export const META_FILE = 'meta.md';

// Parses the library paths from environment variables.
const librariesStr = process.env['MEM_LIBRARIES'];
checks(!!librariesStr, 'MEM_LIBRARIES environment variable is not set. Please provide a comma-separated list of name:path pairs.');

const libraries = new Map<string, string>();

// Parse the MEM_LIBRARIES environment variable and ensure subdirectories exist
if (librariesStr) {
  const pairs = librariesStr.split(',');
  for (const pair of pairs) {
    const [name, libPath] = pair.split(':');
    checks(!!(name && libPath), `Invalid library format in MEM_LIBRARIES: ${pair}`);
    const absolutePath = path.resolve(libPath);
    libraries.set(name, absolutePath);
    ensureLibraryStructure(absolutePath);
    logfile('runtime', `Loaded library '${name}' at path '${absolutePath}'`);
  }
}

/**
 * Ensures the necessary subdirectories exist within a library.
 * @param libraryRootPath The absolute path to the library root.
 */
function ensureLibraryStructure(libraryRootPath: string) {
  shell.mkdir('-p',
              path.join(libraryRootPath, ENTITIES_DIR),
              path.join(libraryRootPath, TRASH_DIR),
              path.join(libraryRootPath, BACKUPS_DIR),
              path.join(libraryRootPath, JOURNEYS_DIR)
  );
}

export function getLibraryDirPath(libraryName: string): FileAbsolutePath {
  const libPath = libraries.get(libraryName);
  checks(!!libPath, `Library '${libraryName}' not found or not loaded.`);
  return libPath;
}

export function getEntityDirPath(libraryName: string): FolderAbsolutePath {
  return path.join(getLibraryDirPath(libraryName), ENTITIES_DIR);
}

export function getJourneyFilePath(libraryName: string, journeyId: string): FileAbsolutePath {
  const fileName = `${journeyId}.md`;
  return path.join(getLibraryDirPath(libraryName), JOURNEYS_DIR, fileName);
}

export function getEntityFilePath(libraryName: string, entityName: string): FileAbsolutePath {
  const fileName = `${entityName}.md`;
  return path.join(getLibraryDirPath(libraryName), ENTITIES_DIR, fileName);
}

export function generateEntityTrashPath(libraryName: string, entityName: string): FileAbsolutePath {
  const fileName = `${entityName}_${(formatTimestamp())}.md`;
  return path.join(getLibraryDirPath(libraryName), TRASH_DIR, fileName);
}

export function generateBackupPath(libraryName: string): FileAbsolutePath {
  const fileName = `${libraryName}-backup-${(formatTimestamp())}.zip`;
  return path.join(getLibraryDirPath(libraryName), BACKUPS_DIR, fileName);
}

export function getMetaFilePath(libraryName: string): FileAbsolutePath {
  return path.join(getLibraryDirPath(libraryName), META_FILE);
}

export function getLibraries(): Map<string, string> {
  return libraries;
}

function formatTimestamp(): string {
  // YYYY-MM-DD-HH-MM-SS
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}
