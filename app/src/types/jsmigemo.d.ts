declare module 'jsmigemo' {
  export class CompactDictionary {
    constructor(buffer: ArrayBuffer);
  }

  export class Migemo {
    constructor();
    setDict(dict: CompactDictionary): void;
    query(input: string): string;
  }
}
