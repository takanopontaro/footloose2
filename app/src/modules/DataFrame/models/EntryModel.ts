import type { Entry } from '@modules/DataFrame/types';

/**
 * エントリを表すモデルクラス。
 * Entry オブジェクトをラップし、様々な機能を提供する。
 */
export class EntryModel {
  /**
   * @param entry - 元となるエントリ
   */
  constructor(
    public readonly entry: Entry,
    public readonly dirname: string,
  ) {}

  /**
   * 仮想ディレクトリ内のエントリか否か。
   */
  get isVirtual(): Entry['isVirtual'] {
    return this.entry.isVirtual;
  }

  /**
   * シンボリックリンクの実体パス。
   */
  get link(): Entry['link'] {
    return this.entry.link;
  }

  /**
   * 名前。
   */
  get name(): Entry['name'] {
    return this.entry.name;
  }

  /**
   * パーミッションのシンボリック表記。
   */
  get perm(): Entry['perm'] {
    return this.entry.perm;
  }

  /**
   * 容量。
   */
  get size(): Entry['size'] {
    return this.entry.size;
  }

  /**
   * 更新日時 (ctime)。
   */
  get time(): Entry['time'] {
    return this.entry.time;
  }

  /**
   * ディレクトリか否かを判定する。
   */
  isDir(): boolean {
    return this.perm.startsWith('d');
  }

  /**
   * ファイルか否かを判定する。
   */
  isFile(): boolean {
    return this.perm.startsWith('-');
  }

  /**
   * シンボリックリンクか否かを判定する。
   */
  isSymlink(): boolean {
    return this.perm.startsWith('l');
  }

  /**
   * 仮想ディレクトリか否かを判定する。
   */
  isVirtualDir(): boolean {
    return this.isVirtual && this.isDir();
  }

  /**
   * 仮想ファイルか否かを判定する。
   */
  isVirtualFile(): boolean {
    return this.isVirtual && this.isFile();
  }

  /**
   * 仮想シンボリックリンクか否かを判定する。
   */
  isVirtualSymlink(): boolean {
    return this.isVirtual && this.isSymlink();
  }
}
