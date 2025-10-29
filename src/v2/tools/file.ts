import {z} from 'zod';
import {zodToJsonSchema} from 'zod-to-json-schema';
import {createFile} from '../shell';

// Zod schema for the createFile tool
export const CreateFileInputSchema = z.object({
  libraryName: z.string().describe('要在其中创建文件的知识库的名称'),
  relativePath: z.string().describe('相对于知识库根目录的文件路径'),
});

// Tool definition for createFile
export const createFileTool = {
  toolType: {
    name: 'createFile',
    description: '在指定的知识库中创建一个新的空文件',
    inputSchema: zodToJsonSchema(CreateFileInputSchema),
  },
  handler: (args: unknown) => {
    const {libraryName, relativePath} = CreateFileInputSchema.parse(args);
    createFile(libraryName, relativePath, []);
    return `---status: success, message: file ${relativePath} created successfully in library ${libraryName}---`;
  },
};
