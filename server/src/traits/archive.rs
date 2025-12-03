use crate::traits::ArchiveEntry;

use std::io::Result;

/// アーカイブエントリのイテレータ型。
pub type ArchiveEntryIter<'a> =
    Box<dyn Iterator<Item = Result<Box<dyn ArchiveEntry>>> + 'a>;

/// アーカイブファイルを扱うためのトレイト。
pub trait Archive {
    /// アーカイブ内のエントリ一覧を取得する。
    ///
    /// # Returns
    /// エントリのイテレータ
    fn entries(&mut self) -> Result<ArchiveEntryIter<'_>>;
}
