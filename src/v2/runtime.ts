import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { checks, logfile } from '../utils.ts';
import path from "path";

// Parses the command line arguments and manages library paths.

const argv = yargs(hideBin(process.argv))
  .option('libraries', {
    alias: 'l',
    type: 'string',
    description: 'A comma-separated list of name:path pairs for knowledge libraries',
    demandOption: true,
  })
  .help()
  .alias('help', 'h')
  .parseSync();

const libraries = new Map<string, string>();

// Parse the --libraries argument
if (argv.libraries) {
  const pairs = argv.libraries.split(',');
  for (const pair of pairs) {
    const [name, libPath] = pair.split(':');
    checks(!!(name && libPath), `Invalid library format: ${pair}`);
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
