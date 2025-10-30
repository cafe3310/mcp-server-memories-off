import { checks, logfile } from '../utils.ts';
import path from "path";

// Parses the library paths from environment variables.

const librariesStr = process.env['MEM_LIBRARIES'];
checks(!!librariesStr, 'MEM_LIBRARIES environment variable is not set. Please provide a comma-separated list of name:path pairs.');

const libraries = new Map<string, string>();

// Parse the MEM_LIBRARIES environment variable
if (librariesStr) {
  const pairs = librariesStr.split(',');
  for (const pair of pairs) {
    const [name, libPath] = pair.split(':');
    checks(!!(name && libPath), `Invalid library format in MEM_LIBRARIES: ${pair}`);
    const absolutePath = path.resolve(libPath);
    libraries.set(name, absolutePath);
    logfile('runtime', `Loaded library '${name}' at path '${absolutePath}'`);
  }
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
 * Returns a map of all loaded libraries.
 */
export function getLibraries(): Map<string, string> {
  return libraries;
}
