import BN from "bn.js";
import bs58 from "bs58";

const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function baseEncode(value: string | Uint8Array | Buffer): string {
  if (typeof value === "string") {
    value = Buffer.from(value, "utf8");
  }
  return bs58.encode(Buffer.from(value));
}

export function baseDecode(value: string): Buffer {
  return Buffer.from(bs58.decode(value));
}

const INITIAL_LENGTH = 1024;

export class BorshError extends Error {
  fieldPath: string[];
  originalMessage: string;

  constructor(message: string) {
    super(message);
    this.fieldPath = [];
    this.originalMessage = message;
  }

  addToFieldPath(fieldName: string) {
    this.fieldPath.splice(0, 0, fieldName);
    this.message = this.originalMessage + ": " + this.fieldPath.join(".");
  }
}

export class BinaryWriter {
  buf: Buffer;
  length: number;

  constructor() {
    this.buf = Buffer.alloc(INITIAL_LENGTH);
    this.length = 0;
  }

  maybeResize() {
    if (this.buf.length < 16 + this.length) {
      this.buf = Buffer.concat([this.buf, Buffer.alloc(INITIAL_LENGTH)]);
    }
  }

  writeU8(value: number) {
    this.maybeResize();
    this.buf.writeUInt8(value, this.length);
    this.length += 1;
  }

  writeU16(value: number) {
    this.maybeResize();
    this.buf.writeUInt16LE(value, this.length);
    this.length += 2;
  }

  writeU32(value: number) {
    this.maybeResize();
    this.buf.writeUInt32LE(value, this.length);
    this.length += 4;
  }

  writeU64(value: number | BN) {
    this.maybeResize();
    this.writeBuffer(Buffer.from(new BN(value).toArray("le", 8)));
  }

  writeU128(value: number | BN) {
    this.maybeResize();
    this.writeBuffer(Buffer.from(new BN(value).toArray("le", 16)));
  }

  writeU256(value: number | BN) {
    this.maybeResize();
    this.writeBuffer(Buffer.from(new BN(value).toArray("le", 32)));
  }

  writeU512(value: number | BN) {
    this.maybeResize();
    this.writeBuffer(Buffer.from(new BN(value).toArray("le", 64)));
  }

  writeBuffer(buffer: Buffer | Uint8Array) {
    this.buf = Buffer.concat([
      Buffer.from(this.buf.subarray(0, this.length)),
      buffer,
      Buffer.alloc(INITIAL_LENGTH),
    ]);
    this.length += buffer.length;
  }

  writeString(str: string) {
    this.maybeResize();
    const b = Buffer.from(str, "utf8");
    this.writeU32(b.length);
    this.writeBuffer(b);
  }

  writeFixedArray(array: Uint8Array | number[]) {
    this.writeBuffer(Buffer.from(array));
  }

  writeArray(array: any[], fn: (item: any) => void) {
    this.maybeResize();
    this.writeU32(array.length);
    for (const elem of array) {
      this.maybeResize();
      fn(elem);
    }
  }

  toArray(): Uint8Array {
    return this.buf.subarray(0, this.length);
  }
}

export class BinaryReader {
  buf: Buffer;
  offset: number;

  constructor(buf: Buffer) {
    this.buf = buf;
    this.offset = 0;
  }

  readU8(): number {
    const value = this.buf.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  readU16(): number {
    const value = this.buf.readUInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  readU32(): number {
    const value = this.buf.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  readU64(): BN {
    const buf = this.readBuffer(8);
    return new BN(buf, "le");
  }

  readU128(): BN {
    const buf = this.readBuffer(16);
    return new BN(buf, "le");
  }

  readU256(): BN {
    const buf = this.readBuffer(32);
    return new BN(buf, "le");
  }

  readU512(): BN {
    const buf = this.readBuffer(64);
    return new BN(buf, "le");
  }

  readBuffer(len: number): Buffer {
    if (this.offset + len > this.buf.length) {
      throw new BorshError(`Expected buffer length ${len} isn't within bounds`);
    }
    const result = this.buf.slice(this.offset, this.offset + len);
    this.offset += len;
    return result;
  }

  readString(): string {
    const len = this.readU32();
    const buf = this.readBuffer(len);
    try {
      return textDecoder.decode(buf);
    } catch (e) {
      throw new BorshError(`Error decoding UTF-8 string: ${e}`);
    }
  }

  readFixedArray(len: number): Uint8Array {
    return new Uint8Array(this.readBuffer(len));
  }

  readArray(fn: () => any): any[] {
    const len = this.readU32();
    const result = [];
    for (let i = 0; i < len; ++i) {
      result.push(fn());
    }
    return result;
  }
}

function capitalizeFirstLetter(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function serializeField(schema: any, fieldName: any, value: any, fieldType: any, writer: any) {
  try {
    if (typeof fieldType === "string") {
      writer[`write${capitalizeFirstLetter(fieldType)}`](value);
    } else if (fieldType instanceof Array) {
      if (typeof fieldType[0] === "number") {
        if (value.length !== fieldType[0]) {
          throw new BorshError(`Expecting byte array of length ${fieldType[0]}, but got ${value.length} bytes`);
        }
        writer.writeFixedArray(value);
      } else if (fieldType.length === 2 && typeof fieldType[1] === "number") {
        if (value.length !== fieldType[1]) {
          throw new BorshError(`Expecting byte array of length ${fieldType[1]}, but got ${value.length} bytes`);
        }
        for (let i = 0; i < fieldType[1]; i++) {
          serializeField(schema, null, value[i], fieldType[0], writer);
        }
      } else {
        writer.writeArray(value, (item: any) => {
          serializeField(schema, fieldName, item, fieldType[0], writer);
        });
      }
    } else if (fieldType.kind !== undefined) {
      switch (fieldType.kind) {
        case "option": {
          if (value === null || value === undefined) {
            writer.writeU8(0);
          } else {
            writer.writeU8(1);
            serializeField(schema, fieldName, value, fieldType.type, writer);
          }
          break;
        }
        case "map": {
          writer.writeU32(value.size);
          value.forEach((val: any, key: any) => {
            serializeField(schema, fieldName, key, fieldType.key, writer);
            serializeField(schema, fieldName, val, fieldType.value, writer);
          });
          break;
        }
        default:
          throw new BorshError(`FieldType ${fieldType} unrecognized`);
      }
    } else {
      serializeStruct(schema, value, writer);
    }
  } catch (error) {
    if (error instanceof BorshError) {
      error.addToFieldPath(fieldName);
    }
    throw error;
  }
}

function serializeStruct(schema: any, obj: any, writer: any) {
  if (typeof obj.borshSerialize === "function") {
    obj.borshSerialize(writer);
    return;
  }
  const structSchema = schema.get(obj.constructor);
  if (!structSchema) {
    throw new BorshError(`Class ${obj.constructor.name} is missing in schema`);
  }
  if (structSchema.kind === "struct") {
    structSchema.fields.map(([fieldName, fieldType]: [string, any]) => {
      serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
    });
  } else if (structSchema.kind === "enum") {
    const name = obj[structSchema.field];
    for (let idx = 0; idx < structSchema.values.length; ++idx) {
      const [fieldName, fieldType] = structSchema.values[idx];
      if (fieldName === name) {
        writer.writeU8(idx);
        serializeField(schema, fieldName, obj[fieldName], fieldType, writer);
        break;
      }
    }
  } else {
    throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${obj.constructor.name}`);
  }
}

export function serialize(schema: any, obj: any, Writer = BinaryWriter): Uint8Array {
  const writer = new Writer();
  serializeStruct(schema, obj, writer);
  return writer.toArray();
}

function deserializeField(schema: any, fieldName: any, fieldType: any, reader: any): any {
  try {
    if (typeof fieldType === "string") {
      return reader[`read${capitalizeFirstLetter(fieldType)}`]();
    }
    if (fieldType instanceof Array) {
      if (typeof fieldType[0] === "number") {
        return reader.readFixedArray(fieldType[0]);
      } else if (typeof fieldType[1] === "number") {
        const arr = [];
        for (let i = 0; i < fieldType[1]; i++) {
          arr.push(deserializeField(schema, null, fieldType[0], reader));
        }
        return arr;
      } else {
        return reader.readArray(() => deserializeField(schema, fieldName, fieldType[0], reader));
      }
    }
    if (fieldType.kind === "option") {
      const option = reader.readU8();
      if (option) {
        return deserializeField(schema, fieldName, fieldType.type, reader);
      }
      return undefined;
    }
    if (fieldType.kind === "map") {
      const map = new Map();
      const length = reader.readU32();
      for (let i = 0; i < length; i++) {
        const key = deserializeField(schema, fieldName, fieldType.key, reader);
        const val = deserializeField(schema, fieldName, fieldType.value, reader);
        map.set(key, val);
      }
      return map;
    }
    return deserializeStruct(schema, fieldType, reader);
  } catch (error) {
    if (error instanceof BorshError) {
      error.addToFieldPath(fieldName);
    }
    throw error;
  }
}

function deserializeStruct(schema: any, classType: any, reader: any) {
  if (typeof classType.borshDeserialize === "function") {
    return classType.borshDeserialize(reader);
  }
  const structSchema = schema.get(classType);
  if (!structSchema) {
    throw new BorshError(`Class ${classType.name} is missing in schema`);
  }
  if (structSchema.kind === "struct") {
    const result: any = {};
    for (const [fieldName, fieldType] of structSchema.fields) {
      result[fieldName] = deserializeField(schema, fieldName, fieldType, reader);
    }
    return new classType(result);
  }
  if (structSchema.kind === "enum") {
    const idx = reader.readU8();
    if (idx >= structSchema.values.length) {
      throw new BorshError(`Enum index: ${idx} is out of range`);
    }
    const [fieldName, fieldType] = structSchema.values[idx];
    const fieldValue = deserializeField(schema, fieldName, fieldType, reader);
    return new classType({ [fieldName]: fieldValue });
  }
  throw new BorshError(`Unexpected schema kind: ${structSchema.kind} for ${classType.constructor.name}`);
}

export function deserialize(schema: any, classType: any, buffer: Buffer, Reader = BinaryReader) {
  const reader = new Reader(buffer);
  const result = deserializeStruct(schema, classType, reader);
  if (reader.offset < buffer.length) {
    throw new BorshError(`Unexpected ${buffer.length - reader.offset} bytes after deserialized data`);
  }
  return result;
}

export function deserializeUnchecked(schema: any, classType: any, buffer: Buffer, Reader = BinaryReader) {
  const reader = new Reader(buffer);
  return deserializeStruct(schema, classType, reader);
}

export default {
  serialize,
  deserialize,
  deserializeUnchecked,
  BinaryReader,
  BinaryWriter,
  BorshError,
  baseDecode,
  baseEncode,
};
