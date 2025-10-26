import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { readFileContent, replaceFileContent } from '../shell.ts';
import YAML from 'yaml';

// Zod schema for the read_manual tool
export const ReadManualInputSchema = z.object({
  libraryName: z.string().describe('The name of the library to read the manual from.'),
});

// Zod schema for the update_manual_section tool
export const UpdateManualSectionInputSchema = z.object({
  libraryName: z.string().describe('The name of the library where the manual will be updated.'),
  toc: z.string().describe('The table of contents (heading) of the section to update. Case and symbol insensitive, e.g. `installation guide` matches `## Installation (Guide)`'),
  oldContent: z.string().describe('The exact old content block to be replaced. Whole lines preferred for accuracy.'),
  newContent: z.string().describe('The new content to replace in the position of old content. Whole lines preferred for accuracy.'),
});

// Tool definition for read_manual
export const readManualTool = {
  toolType: {
    name: 'ReadManual',
    description: 'Reads the entire content of the meta.md file from a specified library.',
    inputSchema: zodToJsonSchema(ReadManualInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName } = ReadManualInputSchema.parse(args);
    const content = readFileContent(libraryName, 'meta.md');
    return { content: [{ type: 'text', text: content }] };
  },
};

// Tool definition for update_manual_section
export const updateManualSectionTool = {
  toolType: {
    name: 'UpdateManualSection',
    description: 'Updates a specific section within the meta.md file of a library.',
    inputSchema: zodToJsonSchema(UpdateManualSectionInputSchema),
  },
  handler: (args: unknown) => {
    const { libraryName, toc, oldContent, newContent } = UpdateManualSectionInputSchema.parse(args);
        
    // This is a simplified implementation. A robust version would parse the markdown AST.
    const fullContent = readFileContent(libraryName, 'meta.md');
    const sectionRegex = new RegExp(`(##\s*${toc}[\s\S]*?)(?=##|$)`);
    const match = fullContent.match(sectionRegex);

    if (!match?.[0]) {
      throw new Error(`Section with heading '${toc}' not found in meta.md.`);
    }

    const sectionContent = match[0];
    const updatedSectionContent = sectionContent.replace(oldContent, newContent);

    replaceFileContent(libraryName, 'meta.md', sectionContent, updatedSectionContent);

    const response = {
      status: 'success',
      message: `Section '${toc}' in meta.md was updated.`,
    };

    return { content: [{ type: 'text', text: YAML.stringify(response) }] };
  },
};

// Export all manual tools in a structured way
export const manualTools = {
  ReadManual: readManualTool,
  UpdateManualSection: updateManualSectionTool,
};
