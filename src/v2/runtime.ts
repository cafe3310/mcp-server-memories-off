import { checks, logfile } from '../utils.ts';
import path from "path";
import shell from 'shelljs';

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

/**
 * Gets the absolute path for a given library name.
 * @param libraryName The name of the library.
 * @returns The absolute file path to the library directory.
 */
export function getLibraryPath(libraryName: string): string {
  const libPath = libraries.get(libraryName);
  checks(!!libPath, `Library '${libraryName}' not found or not loaded.`);
  return libPath;
}

/**
 * Gets the absolute path for the 'entities' directory of a given library.
 * @param libraryName The name of the library.
 * @returns The absolute file path to the entities directory.
 */
export function getEntitiesPath(libraryName: string): string {
  return path.join(getLibraryPath(libraryName), ENTITIES_DIR);
}

/**
 * Gets the absolute path for the 'trash' directory of a given library.
 * @param libraryName The name of the library.
 * @returns The absolute file path to the trash directory.
 */
export function getTrashPath(libraryName: string): string {
  return path.join(getLibraryPath(libraryName), TRASH_DIR);
}

/**
 * Gets the absolute path for the 'backups' directory of a given library.
 * @param libraryName The name of the library.
 * @returns The absolute file path to the backups directory.
 */
export function getBackupsPath(libraryName: string): string {
  return path.join(getLibraryPath(libraryName), BACKUPS_DIR);
}

/**
 * Gets the absolute path for the 'meta.md' file of a given library.
 * @param libraryName The name of the library.
 * @returns The absolute file path to the meta.md file.
 */
export function getMetaPath(libraryName: string): string {
  return path.join(getLibraryPath(libraryName), META_FILE);
}


/**
 * Returns a map of all loaded libraries.
 */
export function getLibraries(): Map<string, string> {
  return libraries;
}
