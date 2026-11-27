-- Lược đồ D1 cho giới hạn lượt Chat Bot. Chạy một lần trên cơ sở dữ liệu gắn với binding DB.
-- Không lưu nội dung hỏi đáp hay địa chỉ IP gốc: chỉ mã băm (muối đổi mỗi ngày) và số lượt. Dữ liệu ngày cũ bị xóa ở lượt hỏi đầu tiên của ngày mới.
CREATE TABLE IF NOT EXISTS chat_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS chat_quota (day TEXT NOT NULL, key TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, key));
