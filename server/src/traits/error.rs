use std::fmt::{Debug, Display};

pub trait ErrorCode: Debug + Display + Send + Sync {
    fn code(&self) -> &str;
}
