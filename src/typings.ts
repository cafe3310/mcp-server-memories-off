/* eslint-disable @typescript-eslint/consistent-type-definitions,@typescript-eslint/consistent-indexed-object-style */
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
