declare module 'jsmigemo' {
  export interface Migemo {
    query(input: string): string;
  }

  const migemo: Migemo;
  export default migemo;
}
