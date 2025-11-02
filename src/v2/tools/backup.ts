import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import type {McpHandlerDefinition} from "../../typings";
import {getLibraryDirPath, generateBackupPath} from '../runtime';
import shell from 'shelljs';

// Zod schema for the backupLibrary tool
export const BackupLibraryInputSchema = z.object({
  libraryName: z.string().describe('要备份的知识库的名称'),
});

/**
 * @tool backupLibrary
 * @description 将指定的知识库完整地压缩备份到一个位于 `backups` 目录下的 .zip 文件中。
 *
 * @input
 * - `libraryName`: (string, required) 要备份的知识库的名称。
 *
 * @output
 * - (string) 返回一个确认信息，包含备份文件的路径和大小。
 *   示例: `Backup created successfully, file: /path/to/your/library/backups/backup-2025-11-03-12-30-00.zip, size: 1.23 MB`
 *
 * @remarks
 * - 该工具会打包知识库目录下的所有文件和子目录，但会排除 `backups` 目录自身，以避免重复备份。
 * - 备份文件名将包含时间戳，格式为 `backup-YYYY-MM-DD-HH-mm-ss.zip`。
 *
 * @todo
 * - 暂无
 */
// Tool definition for backupLibrary
export const backupLibraryTool: McpHandlerDefinition<typeof BackupLibraryInputSchema, 'backupLibrary'> = {
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

    return 'Backup created successfully, file: ' + backupFilePath + ', size: ' + sizeFormatted;
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

export const backupTools = [backupLibraryTool];
