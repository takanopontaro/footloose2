#[derive(PartialEq)]
pub enum TaskStatus {
    End,
    Abort,
}

pub struct TaskControl {
    pub pid: String,
    pub status: TaskStatus,
}
