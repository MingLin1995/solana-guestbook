// @ts-nocheck
import * as BufferLayoutAll from "buffer-layout";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

const BufferLayout: any = BufferLayoutAll;

const {
  Layout,
  blob,
  u8: blU8,
  s8: blS8,
  u16: blU16,
  s16: blS16,
  u32: blU32,
  s32: blS32,
  f32: blF32,
  f64: blF64,
  struct: blStruct,
  seq,
  offset: blOffset,
  union: blUnion,
} = BufferLayout;

export const u8 = blU8;
export const i8 = blS8;
export const u16 = blU16;
export const i16 = blS16;
export const u32 = blU32;
export const i32 = blS32;
export const f32 = blF32;
export const f64 = blF64;
export const struct = blStruct;

export class BNLayout extends Layout<BN> {
  blob: any;
  signed: boolean;

  constructor(span: number, signed: boolean, property?: string) {
    super(span, property);
    this.blob = blob(span);
    this.signed = signed;
  }

  decode(b: Buffer, offset = 0): BN {
    const num = new BN(this.blob.decode(b, offset), 10, "le");
    if (this.signed) {
      return num.fromTwos(this.span * 8).clone();
    }
    return num;
  }

  encode(src: BN, b: Buffer, offset = 0): number {
    if (this.signed) {
      src = src.toTwos(this.span * 8);
    }
    return this.blob.encode(src.toArrayLike(Buffer, "le", this.span), b, offset);
  }
}

export function u64(property?: string): Layout<BN> {
  return new BNLayout(8, false, property);
}

export function i64(property?: string): Layout<BN> {
  return new BNLayout(8, true, property);
}

export function u128(property?: string): Layout<BN> {
  return new BNLayout(16, false, property);
}

export function i128(property?: string): Layout<BN> {
  return new BNLayout(16, true, property);
}

export function u256(property?: string): Layout<BN> {
  return new BNLayout(32, false, property);
}

export function i256(property?: string): Layout<BN> {
  return new BNLayout(32, true, property);
}

export class WrappedLayout<T, U> extends Layout<U> {
  layout: Layout<T>;
  decoder: (val: T) => U;
  encoder: (src: U) => T;

  constructor(
    layout: Layout<T>,
    decoder: (val: T) => U,
    encoder: (src: U) => T,
    property?: string
  ) {
    super(layout.span, property);
    this.layout = layout;
    this.decoder = decoder;
    this.encoder = encoder;
  }

  decode(b: Buffer, offset = 0): U {
    return this.decoder(this.layout.decode(b, offset));
  }

  encode(src: U, b: Buffer, offset = 0): number {
    return this.layout.encode(this.encoder(src), b, offset);
  }

  getSpan(b: Buffer, offset = 0): number {
    return this.layout.getSpan(b, offset);
  }
}

export function publicKey(property?: string): Layout<PublicKey> {
  return new WrappedLayout(
    blob(32),
    (b: any) => new PublicKey(b),
    (key: PublicKey) => key.toBuffer(),
    property
  );
}

export class OptionLayout<T> extends Layout<T | null> {
  layout: Layout<T>;
  discriminator: any;

  constructor(layout: Layout<T>, property?: string) {
    super(-1, property);
    this.layout = layout;
    this.discriminator = blU8();
  }

  encode(src: T | null, b: Buffer, offset = 0): number {
    if (src === null || src === undefined) {
      return this.discriminator.encode(0, b, offset);
    }
    this.discriminator.encode(1, b, offset);
    return this.layout.encode(src, b, offset + 1) + 1;
  }

  decode(b: Buffer, offset = 0): T | null {
    const discriminator = this.discriminator.decode(b, offset);
    if (discriminator === 0) {
      return null;
    } else if (discriminator === 1) {
      return this.layout.decode(b, offset + 1);
    }
    throw new Error("Invalid option " + this.property);
  }

  getSpan(b: Buffer, offset = 0): number {
    const discriminator = this.discriminator.decode(b, offset);
    if (discriminator === 0) {
      return 1;
    } else if (discriminator === 1) {
      return this.layout.getSpan(b, offset + 1) + 1;
    }
    throw new Error("Invalid option " + this.property);
  }
}

export function option<T>(layout: Layout<T>, property?: string): Layout<T | null> {
  return new OptionLayout(layout, property);
}

export function bool(property?: string): Layout<boolean> {
  return new WrappedLayout(
    blU8(),
    (v: number) => {
      if (v === 0) return false;
      if (v === 1) return true;
      throw new Error("Invalid bool: " + v);
    },
    (v: boolean) => (v ? 1 : 0),
    property
  );
}

export function vec<T>(elementLayout: Layout<T>, property?: string): Layout<T[]> {
  const length = blU32("length");
  const layout = blStruct([
    length,
    seq(elementLayout, blOffset(length, -length.span), "values"),
  ]);
  return new WrappedLayout(
    layout,
    ({ values }: any) => values,
    (values: T[]) => ({ values }),
    property
  );
}

export function tagged<T>(tag: BN, layout: Layout<T>, property?: string): Layout<T> {
  const wrappedLayout = blStruct([
    u64("tag"),
    (layout as any).replicate("data"),
  ]);
  return new WrappedLayout(
    wrappedLayout,
    ({ tag: receivedTag, data }: any) => {
      if (!receivedTag.eq(tag)) {
        throw new Error(
          "Invalid tag, expected: " +
            tag.toString("hex") +
            ", got: " +
            receivedTag.toString("hex")
        );
      }
      return data;
    },
    (data: T) => ({ tag, data }),
    property
  );
}

export function vecU8(property?: string): Layout<Buffer> {
  const length = blU32("length");
  const layout = blStruct([
    length,
    blob(blOffset(length, -length.span), "data"),
  ]);
  return new WrappedLayout(
    layout,
    ({ data }: any) => data,
    (data: Buffer) => ({ data }),
    property
  );
}

export function str(property?: string): Layout<string> {
  return new WrappedLayout(
    vecU8(),
    (data: Buffer) => data.toString("utf-8"),
    (s: string) => Buffer.from(s, "utf-8"),
    property
  );
}

export function rustEnum(variants: any[], property?: string, discriminant?: any): any {
  const unionLayout = blUnion(discriminant ?? blU8(), property);
  variants.forEach((variant: any, index: number) =>
    unionLayout.addVariant(index, variant, variant.property)
  );
  return unionLayout;
}

export function array<T>(elementLayout: Layout<T>, length: number, property?: string): Layout<T[]> {
  const layout = blStruct([seq(elementLayout, length, "values")]);
  return new WrappedLayout(
    layout,
    ({ values }: any) => values,
    (values: T[]) => ({ values }),
    property
  );
}

export class MapEntryLayout<K, V> extends Layout<[K, V]> {
  keyLayout: Layout<K>;
  valueLayout: Layout<V>;

  constructor(keyLayout: Layout<K>, valueLayout: Layout<V>, property?: string) {
    super(keyLayout.span + valueLayout.span, property);
    this.keyLayout = keyLayout;
    this.valueLayout = valueLayout;
  }

  decode(b: Buffer, offset = 0): [K, V] {
    const key = this.keyLayout.decode(b, offset);
    const value = this.valueLayout.decode(
      b,
      offset + this.keyLayout.getSpan(b, offset)
    );
    return [key, value];
  }

  encode(src: [K, V], b: Buffer, offset = 0): number {
    const keyBytes = this.keyLayout.encode(src[0], b, offset);
    const valueBytes = this.valueLayout.encode(src[1], b, offset + keyBytes);
    return keyBytes + valueBytes;
  }

  getSpan(b: Buffer, offset = 0): number {
    return this.keyLayout.getSpan(b, offset) + this.valueLayout.getSpan(b, offset);
  }
}

export function map<K, V>(
  keyLayout: Layout<K>,
  valueLayout: Layout<V>,
  property?: string
): Layout<Map<K, V>> {
  const length = blU32("length");
  const layout = blStruct([
    length,
    seq(
      new MapEntryLayout(keyLayout, valueLayout),
      blOffset(length, -length.span),
      "values"
    ),
  ]);
  return new WrappedLayout(
    layout,
    ({ values }: any) => new Map(values),
    (values: Map<K, V>) => ({ values: Array.from(values.entries()) }),
    property
  );
}
