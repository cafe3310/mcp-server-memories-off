import {describe, expect, it} from 'bun:test';
import '../../test/setup';

import {normalize, toTocLine} from "./text.ts";

describe('text helpers', () => {
  it('normalize', () => {
    expect(normalize('  ## Section 1: Details,  ')).toBe('section 1 details');
    expect(normalize('Another Example (with parens!)')).toBe('another example with parens');
    expect(normalize('  Multiple   Spaces  ')).toBe('multiple spaces');
    expect(normalize('A Title\nWith Newlines')).toBe('a title with newlines');
  });

  it('toTocLine', () => {
    expect(toTocLine('My Section')).toBe('## my section');
    expect(toTocLine(' Another Section: Details ', 3)).toBe('### another section details');
  });
});
