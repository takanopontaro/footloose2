use crate::traits::ArchiveEntry;

use std::io::Result;

pub type ArchiveEntryIter<'a> =
    Box<dyn Iterator<Item = Result<Box<dyn ArchiveEntry>>> + 'a>;

pub trait Archive {
    fn entries(&mut self) -> Result<ArchiveEntryIter<'_>>;
}
