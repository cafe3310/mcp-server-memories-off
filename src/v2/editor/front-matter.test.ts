import { describe, test, expect } from 'bun:test';
import '../../test/setup';
import { mergeFrontmatter } from './front-matter';
import { FrontMatterPresetKeys } from '../../typings';

describe('mergeFrontmatter', () => {
  test('should merge new keys from source', () => {
    const target = ['key1: value1'];
    const source = ['key2: value2'];
    const result = mergeFrontmatter(target, source);
    expect(result).toContain('key1: value1');
    expect(result).toContain('key2: value2');
  });

  test('should not change existing keys with same values', () => {
    const target = ['key1: value1'];
    const source = ['key1: value1'];
    const result = mergeFrontmatter(target, source);
    expect(result).toEqual(['key1: value1']);
  });

  test('should merge existing keys with different values', () => {
    const target = ['key1: value1'];
    const source = ['key1: value2'];
    const result = mergeFrontmatter(target, source);
    expect(result).toEqual(['key1: value1, value2']);
  });

  test('should handle aliases correctly (merge and deduplicate)', () => {
    const target = [`${FrontMatterPresetKeys.Aliases}: alias1, alias2`];
    const source = [`${FrontMatterPresetKeys.Aliases}: alias2, alias3`];
    const result = mergeFrontmatter(target, source);
    expect(result).toEqual([`${FrontMatterPresetKeys.Aliases}: alias1, alias2, alias3`]);
  });

  test('should handle a complex mix of cases', () => {
    const target = [
      'type: concept',
      'status: draft',
      `${FrontMatterPresetKeys.Aliases}: T1, T2`,
    ];
    const source = [
      'type: idea',
      'status: draft',
      'habitat: jungle',
      `${FrontMatterPresetKeys.Aliases}: T2, S1`,
    ];
    const result = mergeFrontmatter(target, source);
    expect(result).toHaveLength(4);
    expect(result).toContain('type: concept, idea');
    expect(result).toContain('status: draft');
    expect(result).toContain('habitat: jungle');
    expect(result).toContain(`${FrontMatterPresetKeys.Aliases}: T1, T2, S1`);
  });

  test('should handle empty target', () => {
    const target: string[] = [];
    const source = ['key1: value1', 'key2: value2'];
    const result = mergeFrontmatter(target, source);
    expect(result).toHaveLength(2);
    expect(result).toContain('key1: value1');
    expect(result).toContain('key2: value2');
  });

  test('should handle empty source', () => {
    const target = ['key1: value1', 'key2: value2'];
    const source: string[] = [];
    const result = mergeFrontmatter(target, source);
    expect(result).toEqual(target);
  });
});
