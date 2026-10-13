export const CLUB_NAME = "Nigoto Hub";

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  PRESIDENT: "PRESIDENT",
  VICE_PRESIDENT: "VICE_PRESIDENT",
  MEMBER: "MEMBER",
} as const;
export type ClubRole = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  PRESIDENT: "Chủ nhiệm",
  VICE_PRESIDENT: "Phó chủ nhiệm",
  MEMBER: "Thành viên",
};

export const STATUSES = ["ACTIVE", "PENDING", "INACTIVE", "ALUMNI"] as const;
export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  PENDING: "Chờ duyệt",
  INACTIVE: "Tạm nghỉ",
  ALUMNI: "Cựu thành viên",
};

export const POSITIONS = ["HEAD", "VICE_HEAD", "MEMBER"] as const;
export type DeptPosition = (typeof POSITIONS)[number];
export const POSITION_LABEL: Record<string, string> = {
  HEAD: "Trưởng ban",
  VICE_HEAD: "Phó ban",
  MEMBER: "Thành viên",
};

export const DEPT_IDS = {
  bcn: "bcn",
  members: "members",
  media: "media",
  academic: "academic",
  event: "event",
} as const;

export const DEPT_SEED = [
  { id: "bcn", name: "Ban Chủ nhiệm", description: "Điều hành nhân sự, công việc và công bố hoạt động.", sort: 0 },
  { id: "members", name: "Ban Thành viên", description: "Nơi thành viên mới trước khi được phân ban chuyên môn.", sort: 1 },
  { id: "media", name: "Ban Truyền thông", description: "Nội dung, poster, bảng tin và lịch đăng bài.", sort: 2 },
  { id: "academic", name: "Ban Học thuật", description: "Khóa học tiếng Nhật, từ vựng và tài liệu.", sort: 3 },
  { id: "event", name: "Ban Sự kiện", description: "Tổ chức sự kiện, điểm danh và hậu cần.", sort: 4 },
] as const;

export const EVENT_TYPES = [
  { id: "CULTURE", label: "Văn hóa" },
  { id: "WORKSHOP", label: "Workshop" },
  { id: "EXCHANGE", label: "Giao lưu" },
  { id: "CLASS", label: "Lớp học" },
  { id: "CONTEST", label: "Cuộc thi" },
  { id: "TEAM", label: "Team building" },
  { id: "RECRUIT", label: "Tuyển thành viên" },
  { id: "INTERNAL", label: "Nội bộ" },
] as const;

export const EVENT_STATUS = [
  { id: "DRAFT", label: "Nháp" },
  { id: "UPCOMING", label: "Sắp diễn ra" },
  { id: "ONGOING", label: "Đang diễn ra" },
  { id: "COMPLETED", label: "Đã xong" },
  { id: "CANCELLED", label: "Hủy" },
] as const;

export const TASK_STATUS = [
  { id: "TODO", label: "Cần làm" },
  { id: "IN_PROGRESS", label: "Đang làm" },
  { id: "REVIEW", label: "Chờ duyệt" },
  { id: "COMPLETED", label: "Hoàn thành" },
] as const;

export const TASK_PRIORITY = [
  { id: "LOW", label: "Thấp" },
  { id: "MEDIUM", label: "Trung bình" },
  { id: "HIGH", label: "Cao" },
  { id: "URGENT", label: "Khẩn" },
] as const;

export const CONTENT_STATUS = [
  { id: "IDEA", label: "Ý tưởng" },
  { id: "SUBMITTED", label: "Chờ duyệt" },
  { id: "APPROVED", label: "Đã duyệt" },
  { id: "REJECTED", label: "Từ chối" },
  { id: "CHANGES", label: "Yêu cầu sửa" },
  { id: "SCHEDULED", label: "Lên lịch" },
  { id: "PUBLISHED", label: "Đã đăng" },
] as const;

export const PLATFORMS = [
  { id: "FACEBOOK", label: "Facebook" },
  { id: "INSTAGRAM", label: "Instagram" },
  { id: "TIKTOK", label: "TikTok" },
  { id: "OTHER", label: "Khác" },
] as const;

export const CONTENT_TYPES = [
  { id: "POSTER", label: "Poster" },
  { id: "CAPTION", label: "Caption" },
  { id: "VIDEO", label: "Video" },
  { id: "REEL", label: "Reel" },
  { id: "STORY", label: "Story" },
  { id: "RECAP", label: "Recap" },
  { id: "RECRUIT", label: "Tuyển quân" },
  { id: "ANNOUNCE", label: "Thông báo" },
  { id: "EDU", label: "Học thuật" },
] as const;

export const COURSE_ITEM_KINDS = [
  { id: "VIDEO", label: "Video" },
  { id: "DOC", label: "Tài liệu" },
] as const;

export function normalizeCourseKind(kind: string | null | undefined): "VIDEO" | "DOC" {
  return kind === "VIDEO" ? "VIDEO" : "DOC";
}

export const LIMITS = {
  name: 30,
  studentId: 10,
  phone: 12,
  title: 100,
  description: 2000,
  videoBytes: 8 * 1024 * 1024,
  chat: 400,
  chatFile: 2 * 1024 * 1024,
};

export const CHAT_REACT = ["👍", "❤️", "😂", "😮", "😢", "😡"] as const;

export const CHAT_EMOJI = [
  "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😎", "🤔", "😅",
  "😭", "😡", "😱", "😴", "🤗", "👍", "👎", "👏", "🙏", "🔥",
  "❤️", "💯", "✨", "🎉", "🌸", "☀️", "☕", "📚", "🇯🇵", "✅",
] as const;

export function labelOf(list: readonly { id: string; label: string }[], id: string) {
  return list.find((x) => x.id === id)?.label ?? id;
}
