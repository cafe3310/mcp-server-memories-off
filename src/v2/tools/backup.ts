import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import type {McpHandlerDefinition} from "../../typings";
import {getLibraryDirPath, generateBackupPath} from '../runtime';
import shell from 'shelljs';
import yaml from 'yaml';

// Zod schema for the backupLibrary tool
export const BackupLibraryInputSchema = z.object({
  libraryName: z.string().describe('要备份的知识库的名称'),
});

// Tool definition for backupLibrary
export const backupLibraryTool: McpHandlerDefinition = {
  toolType: {
    name: 'backupLibrary',
    description: '将指定的知识库压缩备份到一个 .zip 文件中',
    inputSchema: zodToJsonSchema(BackupLibraryInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName} = BackupLibraryInputSchema.parse(args);
    const libraryPath = getLibraryDirPath(libraryName);
    const backupFilePath = generateBackupPath(libraryName);

    const originalDir = shell.pwd().toString();
    shell.cd(libraryPath);
    const zipResult = shell.exec(`zip -r "${backupFilePath}" . -x "backups/*"`, {silent: true});
    shell.cd(originalDir);

    if (zipResult.code !== 0) {
      throw new Error(`Failed to create zip archive: ${zipResult.stderr}`);
    }

    const stats = shell.exec(`stat -f "%z" "${backupFilePath}"`, {silent: true}).stdout.trim();
    const sizeInBytes = parseInt(stats, 10);
    const sizeFormatted = formatBytes(sizeInBytes);

    return yaml.stringify({
      status: 'success',
      backupFile: backupFilePath,
      size: sizeFormatted,
      message: 'Backup created successfully.',
    });
  },
};

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {return '0 Bytes';}
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const backupTools: McpHandlerDefinition[] = [backupLibraryTool];
