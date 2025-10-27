/* eslint-disable @typescript-eslint/consistent-type-definitions,@typescript-eslint/consistent-indexed-object-style */
// noinspection JSUnusedLocalSymbols

///////////////////////////////////////////////////////////////////////////
// region 一些 Typing magic
///////////////////////////////////////////////////////////////////////////

/** 给一个类型加 Tag，让它和 T 产生关联 */
export type RelatedTo<T> = {
  readonly ___related?: T;
};

/**
 * 给一个类型加 Tag，让它和 Tag 不同的另一个类型不相互兼容。
 * 例如，允许 string 的各个 sub-type 不相互兼容。
 * 参考：https://github.com/Microsoft/TypeScript/issues/4895#issuecomment-425132582
 */
export type OpaqueTag<Tag extends string> = {
  readonly ___tag?: Tag;
};

/**
 * 用 S 作为标记，创建一个和 string 完全无关的类
 * 无法 cast 回 string, 除非先 case 成 any
 */
export type SuperOpaque<Tag extends string> = OpaqueTag<Tag>;

/**
 * 用 S 作为标记，创建一个 T 的 sub-type
 * 可被 implicit cast 到 T
 */
export type WeakOpaque<BaseType, Tag extends string> = BaseType & OpaqueTag<Tag>;

/**
 * 用 S 作为标记，创建一个 T 的 super-type
 * 可被 explicit cast 到 T
 */
export type StrongOpaque<BaseType, Tag extends string> = WeakOpaque<BaseType, Tag> | SuperOpaque<Tag>;

/**
 * Magic! 它能用于定义下面两个工具类型
 */
export type IfEquals<X, Y, A = X, B = never> =
    (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? A : B;

/**
 * T 中所有 readonly 的 key
 */
export type ReadonlyKeys<T> = {
  [P in keyof T]-?: IfEquals<Record<P, T[P]>, { -readonly [Q in P]: T[P] }, never, P>
}[keyof T];

/**
 * T 中所有非 readonly 的 key
 */
export type WritableKeys<T> = {
  [P in keyof T]-?: IfEquals<Record<P, T[P]>, { -readonly [Q in P]: T[P] }, P>
}[keyof T];

/**
 * T 中所有值的类型符合约束 V 的 key
 */
export type MatchingKeys<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never
}[keyof T];

///////////////////////////////////////////////////////////////////////////
// endregion
// region 具体 typings
///////////////////////////////////////////////////////////////////////////

// 知识库名称
// 如 "MyProjectDocs"
export type LibraryName = WeakOpaque<string, 'LibraryName'>;

// 知识库绝对路径
// 如 "/home/user/docs/MyProjectDocs"
export type LibraryPath = WeakOpaque<string, 'LibraryPath'>;

// 文件相对路径，相对于知识库根目录。
// 如 "guides/installation.md"
export type FileRelativePath = WeakOpaque<string, 'FileRelativePath'>;

// 文件绝对路径
// 如 "/home/user/docs/MyProjectDocs/guides/installation.md"
export type FileAbsolutePath = WeakOpaque<string, 'FileAbsolutePath'>;

// 模糊匹配的章节标题。
// 如 "installation guide"
export type TocGlob = WeakOpaque<string, 'TocGlob'>;

// 精确匹配的章节标题行。
// 如 "## Installation (Guide):"
export type TocExactLine = WeakOpaque<string, 'TocExactLine'>;

// 模糊匹配的内容块，基于行。
// 如 "this is the beginning of the section*"
export type ContentGlobLine = WeakOpaque<string, 'ContentGlobLine'>;

// 精确匹配的内容块，单行。
// 如 "  - This is the beginning of the section."
export type ContentExactLine = WeakOpaque<string, 'ContentExactLine'>;

// 行号，从 1 开始计数
export type LineNumber = WeakOpaque<number, 'LineNumber'>;

// 用于定位文件中某个位置的内容上下文块。
// 可以是基于行号的范围，或者是基于内容的精确块。
export type ContentLocator = {
  type: 'NumbersAndLines'
  beginLineNumber: LineNumber;
  endLineNumber: LineNumber;
  beginContentLine: ContentExactLine;
  endContentLine: ContentExactLine;
} | {
  type: 'Lines'
  contentLines: ContentExactLine[];
}

// TOCLevel，从 1 开始计数
// 1 - #
// 2 - ##
// ...
// 6 - ######
export type TocLevel = WeakOpaque<number, 'TocLevel'>;

// 一个 Toc 行项
export type TocItem = {
  level: TocLevel;
  lineNumber: LineNumber;
  tocLineContent: TocExactLine;
}

// 一个文件的所有目录行列表
// TocList, Array of {level, lineNumber, tocLineContent}
// 如 [
//   { level: 1, lineNumber: 3, tocLineContent: "# Installation" },
//   { level: 2, lineNumber: 10, tocLineContent: "## Step 1" },
//   ...
// ]
export type TocList = TocItem[];

// 整个文件的所有行
export type FileWholeLines = WeakOpaque<string[], 'FileWholeLines'>;

