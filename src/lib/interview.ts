export const INTERVIEW_BANS = [
  {
    id: "event",
    label: "Ban Sự kiện",
    intro: "",
    criteria: [
      { id: "plan", title: "Tư duy tổ chức và lập kế hoạch", hint: "Phân công, tiến độ, thời gian, nhân lực và ngân sách.", max: 20 },
      { id: "crisis", title: "Xử lý tình huống", hint: "Ứng biến khi thiếu nhân lực, sai lịch hoặc có sự cố.", max: 20 },
      { id: "trust", title: "Trách nhiệm và độ tin cậy", hint: "Giữ deadline, chủ động báo khó khăn, nhận trách nhiệm và theo sát công việc.", max: 20 },
      { id: "team", title: "Làm việc nhóm và phối hợp", hint: "Phân công rõ ràng, giải quyết bất đồng và phối hợp với các ban.", max: 15 },
      { id: "fit", title: "Sáng tạo và phù hợp với Nigoto", hint: "Ý tưởng hoạt động vui, có điểm nhấn văn hóa Nhật và khả thi.", max: 15 },
      { id: "speak", title: "Giao tiếp và trình bày", hint: "Truyền đạt ý tưởng dễ hiểu, đúng trọng tâm, biết trao đổi khi có vấn đề.", max: 10 },
    ],
  },
  {
    id: "media",
    label: "Ban Truyền thông",
    intro:
      "Bảng điểm chung cho ban, kèm tiêu chí chuyên môn theo mảng (Quản lý/Content & Đăng bài, Edit & Thiết kế, Chụp ảnh). Tuyển chung, không đánh đồng các vị trí.",
    criteria: [
      { id: "craft", title: "Năng lực chuyên môn theo mảng", hint: "Content: viết và lập kế hoạch. Edit: dựng và thiết kế. Chụp ảnh: bố cục, bắt khoảnh khắc, chọn ảnh.", max: 30 },
      { id: "idea", title: "Sáng tạo và tư duy nội dung", hint: "Ý tưởng có điểm nhấn, hợp đối tượng sinh viên và định hướng văn hóa Nhật của Nigoto.", max: 20 },
      { id: "time", title: "Quản lý thời gian và trách nhiệm", hint: "Đúng deadline, chủ động cập nhật tiến độ, tiếp nhận và sửa lỗi.", max: 20 },
      { id: "team", title: "Phối hợp trong ban và liên ban", hint: "Nhận brief, phản hồi, bàn giao file và phối hợp với Ban Sự kiện/Học thuật.", max: 15 },
      { id: "audience", title: "Tư duy đối tượng và mục tiêu truyền thông", hint: "Biết sản phẩm dành cho ai, nhằm mục đích gì và đánh giá hiệu quả ra sao.", max: 10 },
      { id: "feedback", title: "Giao tiếp và tiếp nhận góp ý", hint: "Giải thích lựa chọn chuyên môn, trao đổi lịch sử và điều chỉnh có lý do.", max: 5 },
    ],
  },
  {
    id: "academic",
    label: "Ban Học thuật",
    intro:
      "Không nhất thiết tuyển toàn người giỏi tiếng Nhật. Thành viên còn cần tìm hiểu, kiểm chứng và biến kiến thức thành hoạt động.",
    criteria: [
      { id: "source", title: "Tìm kiếm và kiểm chứng thông tin", hint: "Biết tra cứu nguồn, phân biệt thông tin đáng tin cậy, tránh truyền bá kiến thức sai về Nhật Bản.", max: 25 },
      { id: "make", title: "Sáng tạo nội dung và hoạt động", hint: "Biến kiến thức thành quiz, minigame, workshop, bài đăng hoặc hoạt động giao lưu.", max: 20 },
      { id: "explain", title: "Khả năng giải thích và truyền đạt", hint: "Giải thích khái niệm dễ hiểu, phù hợp với người chưa biết tiếng Nhật hoặc văn hóa Nhật.", max: 15 },
      { id: "trust", title: "Trách nhiệm và độ tin cậy", hint: "Hoàn thành nội dung đúng hạn, kiểm tra thông tin trước khi công bố, chủ động sửa sai.", max: 20 },
      { id: "team", title: "Làm việc nhóm và phối hợp", hint: "Phối hợp với Truyền thông để triển khai nội dung, với Sự kiện để xây dựng hoạt động.", max: 10 },
      { id: "speak", title: "Giao tiếp và trình bày", hint: "Trình bày được lập luận, giải thích lựa chọn và trao đổi khi có ý kiến trái chiều.", max: 10 },
    ],
  },
] as const;

export type InterviewBanId = (typeof INTERVIEW_BANS)[number]["id"];

export function interviewBan(id: string) {
  return INTERVIEW_BANS.find((b) => b.id === id) ?? null;
}

export function interviewMax(id: string) {
  return interviewBan(id)?.criteria.reduce((n, c) => n + c.max, 0) ?? 100;
}
