import {FrontMatterPresetKeys, type LibraryName, type ThingName} from "../../typings.ts";
import {readFileLines, writeFileLines} from "./file-ops.ts";
import {FileType} from "../../typings.ts";

export function locateFrontMatter(lines: string[]): { startLineNumber: number; endLineNumber: number } | null {
  if (lines[0]?.trim() !== '---') {
    return null;
  }
  const endLineIndex = lines.slice(1).findIndex(line => line.trim() === '---');
  if (endLineIndex === -1) {
    return null;
  }
  return { startLineNumber: 1, endLineNumber: endLineIndex + 2 };
}

export function mergeFrontmatter(targetLines: string[], sourceLines: string[]): string[] {
  const merged = new Map<string, string>();

  // Process target lines first
  for (const line of targetLines) {
    const [key, ...valueParts] = line.split(': ');
    if (key) {
      merged.set(key, valueParts.join(': '));
    }
  }

  // Merge source lines
  for (const line of sourceLines) {
    const [key, ...valueParts] = line.split(': ');
    if (!key) continue;

    const value = valueParts.join(': ');
    if (merged.has(key)) {
      const existingValue = merged.get(key)!;
      if (existingValue === value) continue; // Skip if values are identical

      // Special handling for aliases (combine and deduplicate)
      if (key === FrontMatterPresetKeys.Aliases) {
        const targetAliases = existingValue.split(',').map(s => s.trim());
        const sourceAliases = value.split(',').map(s => s.trim());
        const combined = [...new Set([...targetAliases, ...sourceAliases])];
        merged.set(key, combined.join(', '));
      } else {
        // For all other keys (including 'entity type'), concatenate values
        merged.set(key, `${existingValue}, ${value}`);
      }
    } else {
      merged.set(key, value);
    }
  }

  // Convert map back to lines
  const result: string[] = [];
  for (const [key, value] of merged.entries()) {
    result.push(`${key}: ${value}`);
  }

  return result;
}

export function readFrontMatterLines(libraryName: LibraryName, fileType: FileType, name: ThingName): string[] | null {
  const lines = readFileLines(libraryName, fileType, name);
  const frontMatterEndIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');

  if (frontMatterEndIndex === -1 || !lines[0]?.startsWith('---')) {
    return null;
  }

  return lines.slice(1, frontMatterEndIndex);
}

export function writeFrontMatterLines(libraryName: LibraryName, fileType: FileType, name: ThingName, frontMatterLines: string[]): void {
  const lines = readFileLines(libraryName, fileType, name);
  const frontMatterEndIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');

  const hasFrontMatter = frontMatterEndIndex !== -1 && lines[0]?.startsWith('---');

  let contentLines: string[];
  if (hasFrontMatter) {
    contentLines = lines.slice(frontMatterEndIndex + 1);
  } else {
    contentLines = lines;
  }

  const newLines = [
    '---',
    ...frontMatterLines,
    '---',
    ...contentLines,
  ];

  writeFileLines(libraryName, fileType, name, newLines);
}
