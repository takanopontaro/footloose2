/// ふたつのフレームのパス情報を扱う構造体。
///
/// # Fields
/// * `a` - フレーム A のパス
/// * `b` - フレーム B のパス
pub struct FrameSet {
    a: String,
    b: String,
}

impl FrameSet {
    /// 新しい FrameSet を作成する。
    ///
    /// 初期値は空文字列。
    pub fn new() -> Self {
        Self {
            a: "".to_owned(),
            b: "".to_owned(),
        }
    }

    /// 指定されたフレームのパスを取得する。
    ///
    /// # Arguments
    /// * `key` - フレームキー
    ///
    /// # Panics
    /// `key` が `a`, `b` 以外の場合はパニックする。
    pub fn path(&self, key: &str) -> &str {
        match key {
            "a" => &self.a,
            "b" => &self.b,
            _ => unreachable!(),
        }
    }

    /// 指定されたフレームの、反対側のフレームのパスを取得する。
    ///
    /// # Arguments
    /// * `key` - フレームキー
    ///
    /// # Panics
    /// `key` が `a`, `b` 以外の場合はパニックする。
    pub fn other_path(&self, key: &str) -> &str {
        match key {
            "a" => &self.b,
            "b" => &self.a,
            _ => unreachable!(),
        }
    }

    /// 両方のフレームのパスを取得する。
    ///
    /// # Returns
    /// (フレーム A のパス, フレーム B のパス) のタプル
    pub fn both_paths(&self) -> (&str, &str) {
        (&self.a, &self.b)
    }

    /// 新しいパスを設定することで使用されなくなる古いパスを取得する。
    ///
    /// # Arguments
    /// * `key` - フレームキー
    /// * `new_path` - 新しく設定されるパス
    ///
    /// # Returns
    /// 使用されなくなるパス
    /// 古いパスがもう一方のフレームでまだ使用されている場合は None を返す。
    pub fn path_to_be_unused(&self, key: &str, new_path: &str) -> Option<&str> {
        let cur_path = self.path(key);
        let other_path = self.other_path(key);
        if cur_path == new_path || other_path == cur_path {
            return None;
        }
        Some(cur_path)
    }

    /// 指定したフレームのパスを更新する。
    ///
    /// # Arguments
    /// * `key` - フレームキー
    /// * `path` - 新しいパス
    ///
    /// # Panics
    /// `key` が `a`, `b` 以外の場合はパニックする。
    pub fn update_path(&mut self, key: &str, path: &str) {
        let path = path.to_owned();
        match key {
            "a" => self.a = path,
            "b" => self.b = path,
            _ => unreachable!(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[should_panic]
    fn test_path_invalid_key() {
        let set = FrameSet::new();
        set.path("c");
    }

    #[test]
    fn test_other_path() {
        let set = FrameSet {
            a: "path_a".to_owned(),
            b: "path_b".to_owned(),
        };
        assert_eq!(set.other_path("a"), "path_b");
        assert_eq!(set.other_path("b"), "path_a");
    }

    #[test]
    #[should_panic]
    fn test_other_path_invalid_key() {
        let set = FrameSet::new();
        set.other_path("c");
    }

    #[test]
    fn test_both_paths() {
        let set = FrameSet {
            a: "path_a".to_owned(),
            b: "path_b".to_owned(),
        };
        let (a, b) = set.both_paths();
        assert_eq!(a, "path_a");
        assert_eq!(b, "path_b");
    }

    #[test]
    fn test_path_to_be_unused() {
        let set = FrameSet {
            a: "path_a".to_owned(),
            b: "path_b".to_owned(),
        };
        assert_eq!(set.path_to_be_unused("a", "new_path"), Some("path_a"));
        assert_eq!(set.path_to_be_unused("b", "new_path"), Some("path_b"));
        assert_eq!(set.path_to_be_unused("a", "path_a"), None);
        assert_eq!(set.path_to_be_unused("b", "path_b"), None);
        let set = FrameSet {
            a: "path_a".to_owned(),
            b: "path_a".to_owned(),
        };
        assert_eq!(set.path_to_be_unused("a", "new_path"), None);
        assert_eq!(set.path_to_be_unused("b", "new_path"), None);
    }

    #[test]
    fn test_update_path() {
        let mut set = FrameSet::new();
        set.update_path("a", "new_path_a");
        set.update_path("b", "new_path_b");
        assert_eq!(set.path("a"), "new_path_a");
        assert_eq!(set.path("b"), "new_path_b");
    }

    #[test]
    #[should_panic]
    fn test_update_path_invalid_key() {
        let mut set = FrameSet::new();
        set.update_path("c", "new_path");
    }
}
