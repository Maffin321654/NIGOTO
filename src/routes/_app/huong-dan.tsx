import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { getMe } from "@/lib/server/fns";
import { useRpc } from "@/lib/use-rpc";

export const Route = createFileRoute("/_app/huong-dan")({ component: Guide });

type Block = {
  id: string;
  title: string;
  lead: string;
  can: string[];
  cannot: string[];
  how: string[];
};

const LAWS: { chapter: string; articles: string[] }[] = [
  {
    chapter: "Điều 1 — Tư cách thành viên",
    articles: [
      "Mỗi người chỉ được một tài khoản. Không tạo nick phụ, không cho người ngoài CLB mượn tài khoản.",
      "Họ tên, MSSV, ngày sinh, email đăng nhập phải đúng sự thật. Sai thì báo Chủ nhiệm sửa hộ — không tự đổi được.",
      "Không xóa tài khoản của mình. Nghỉ CLB thì báo Ban Chủ nhiệm để chuyển trạng thái (tạm nghỉ / cựu thành viên).",
      "Giữ mật khẩu riêng. Không nhắn mật khẩu trong Chat hay cho người khác.",
    ],
  },
  {
    chapter: "Điều 2 — Ứng xử trên Hub",
    articles: [
      "Hub là workspace nội bộ CLB Nhật ngữ Nigoto, không phải mạng xã hội công khai. Chỉ dùng cho việc CLB.",
      "Nói chuyện lịch sự, đúng văn hóa câu lạc bộ. Không công kích, không phân biệt, không đăng thông tin đời tư người khác.",
      "Không giả danh Ban Chủ nhiệm, không loan tin giả. Thông tin chính thức chỉ nằm ở Thông báo / bảng tin.",
      "Không cố ý phá giao diện, spam form, hay dùng Hub để quảng cáo việc không liên quan CLB.",
    ],
  },
  {
    chapter: "Điều 3 — Chat chung",
    articles: [
      "Mọi thành viên được chat. Có thể trả lời, thả emoji, gửi ảnh/tệp tối đa 2MB.",
      "Cấm văn tục. Hệ thống chặn tin, timeout 30 giây, và cộng 1 lần vi phạm vào hồ sơ.",
      "Số lần vi phạm chỉ hiện với chính người đó và Ban Chủ nhiệm.",
      "Chỉ Ban Chủ nhiệm được xóa từng tin hoặc xóa toàn bộ khung chat. Thành viên thường không xóa được tin đã gửi.",
      "Không gửi ảnh nhạy cảm, file độc hại, hay tài liệu có bản quyền không được phép chia sẻ.",
    ],
  },
  {
    chapter: "Điều 4 — Sự kiện và điểm danh",
    articles: [
      "Chỉ sự kiện đã công bố mới hiện với thành viên. Nháp là việc của Ban Sự kiện / Ban Chủ nhiệm.",
      "Điểm danh bằng QR hoặc link /checkin/… khi cổng đang mở. Mỗi người một lần / một sự kiện. Không điểm danh hộ.",
      "Có mặt thật mới quét. Quét hộ người vắng mặt là gian lận danh sách.",
      "Hủy buổi: Ban Sự kiện phải ẩn hoặc xóa sự kiện, không để lịch giả công khai.",
    ],
  },
  {
    chapter: "Điều 5 — Học thuật và truyền thông",
    articles: [
      "Khóa học chưa công bố chỉ Ban Học thuật / Ban Chủ nhiệm thấy. Công bố khi giáo trình đã chốt.",
      "Bài Video trên khóa học chỉ nhận link Google Drive. Không upload file máy vượt hạn mức hệ thống.",
      "Content Media phải gắn ngày giờ đăng. Thiếu lịch thì không lưu. Duyệt trước khi đăng ra ngoài.",
      "Không lấy poster, caption, video của CLB đăng nơi khác khi chưa được Ban Truyền thông cho phép.",
    ],
  },
  {
    chapter: "Điều 6 — Nhân sự và quyền hạn",
    articles: [
      "Phân ban, đổi vai trò, tạo việc, xóa tài khoản người khác: Ban Chủ nhiệm. Sửa giấy tờ tùy thân: chỉ Chủ nhiệm hoặc Trưởng ban Chủ nhiệm.",
      "Không tự nhận quyền ban khác. Menu hiện thêm trang nào thì mới được làm việc đó.",
      "Không xóa Chủ nhiệm cuối cùng của CLB. Bàn giao: gán người kế nhiệm trước, rồi mới hạ vai trò của mình.",
    ],
  },
  {
    chapter: "Điều 7 — Xử lý vi phạm",
    articles: [
      "Lần 1 (chat từ cấm): timeout 30 giây + ghi nhận trên hồ sơ.",
      "Tái phạm nhiều lần, spam, điểm danh hộ, hoặc xúc phạm: Ban Chủ nhiệm có thể tạm nghỉ tài khoản hoặc chuyển cựu thành viên.",
      "Làm lộ dữ liệu thành viên (MSSV, SĐT, ngày sinh) ra ngoài Hub: xử lý kỷ luật, có thể xóa quyền truy cập.",
      "Khiếu nại: nhắn Ban Chủ nhiệm. Quyết định cuối thuộc Chủ nhiệm.",
    ],
  },
];

const BLOCKS: Block[] = [
  {
    id: "common",
    title: "Dùng Hub như thế nào",
    lead: "Áp dụng cho mọi tài khoản đã đăng nhập. Thanh bên trái là lối vào từng khu vực. Đọc Bộ luật ở trên trước khi làm việc.",
    can: [
      "Đăng nhập bằng email + mật khẩu đã tạo. Không có đăng nhập Google hay số điện thoại.",
      "Dùng ô tìm kiếm trên cùng để tìm thành viên (theo tên, MSSV) và sự kiện đã được phép xem.",
      "Mở Hồ sơ (cuối menu) để xem thông tin của mình và cập nhật số điện thoại.",
      "Đọc bảng tin ở Thông báo, bấm chuông trên cùng để xem thông báo riêng.",
      "Bấm vào một thành viên / ban / sự kiện / khóa học để xem trang chi tiết — không chỉ dừng ở danh sách.",
      "Vào Chat chung để nhắn với cả CLB (trả lời, emoji, ảnh/tệp ≤ 2MB).",
    ],
    cannot: [
      "Tự đổi họ tên, MSSV, ngày sinh hay email đăng nhập của mình — chỉ Chủ nhiệm (hoặc Trưởng ban Chủ nhiệm) làm giúp khi có sai sót.",
      "Xóa tài khoản của chính mình.",
      "Dùng từ cấm trong chat — hệ thống timeout 30 giây và ghi vi phạm.",
      "Tải video lớn hơn 8MB lên khóa học. File nặng hãy dán link Google Drive.",
    ],
    how: [
      "Menu bên trái: mục đang đứng có nền sáng và icon vàng.",
      "Điện thoại: bấm biểu tượng ba gạch góc trên để mở menu.",
      "Nếu một trang báo lỗi cột / tải quá lâu, bấm Tải lại. Đừng tạo tài khoản thứ hai trừ khi được Ban Chủ nhiệm yêu cầu.",
    ],
  },
  {
    id: "members",
    title: "Ban Thành viên",
    lead: "Đây là nơi thành viên mới đứng trước khi được phân vào ban chuyên môn. Hub chỉ mở những gì CLB đã công bố.",
    can: [
      "Dashboard: xem số thành viên, sự kiện sắp tới đã công bố, bảng tin mới.",
      "Thành viên: xem danh sách và bấm vào từng người để xem hồ sơ. MSSV của người khác bị che một phần.",
      "Ban: xem 5 ban và danh sách người trong từng ban.",
      "Sự kiện: chỉ thấy sự kiện đã công bố. Bấm vào sự kiện để xem mô tả, thời gian, địa điểm và bấm tham gia.",
      "Khóa học: chỉ thấy khóa đã được Ban Học thuật / Ban Chủ nhiệm công bố. Vào từng khóa để xem video hoặc tài liệu.",
      "Điểm danh: không hiện mã QR. Khi ban quản trị đưa QR, quét hoặc mở link /checkin/… — trang sẽ báo Đã điểm danh.",
      "Quỹ: xem số tiền quỹ, các khoản thu chi và ai đã đóng quỹ trong học kỳ. Không tick, không sửa số tiền.",
      "Đóng góp ý tưởng: gửi thư ý tưởng và xem thư của mọi người. Không xóa được.",
      "Chat chung, Thông báo, Hướng dẫn, Hồ sơ.",
    ],
    cannot: [
      "Không có mục Công việc, Media, Lịch, Thống kê trên menu — những trang này chỉ hiện sau khi được phân vào ban chuyên môn hoặc Ban Chủ nhiệm.",
      "Không tạo / sửa / xóa sự kiện, khóa học, bài đăng Media, bảng tin, công việc.",
      "Không thấy sự kiện còn là nháp, khóa học chưa công bố, hay content truyền thông.",
      "Không bật/tắt điểm danh, không xem mã QR, không phân ban, không đổi quyền người khác.",
      "Không sửa quỹ: không tick đóng quỹ, không đổi quỹ gốc, không thêm hoặc xóa khoản thu chi.",
      "Không thấy MSSV đầy đủ của thành viên khác.",
      "Không xóa tin nhắn trên Chat chung.",
    ],
    how: [
      "Ngày sự kiện: tới bàn check-in, quét QR. Nếu báo chưa nhận điểm danh, nhờ ban tổ chức bật lại công tắc trên trang Điểm danh.",
      "Muốn làm việc chuyên môn: nhắn Ban Chủ nhiệm phân bạn vào Ban Truyền thông, Học thuật hoặc Sự kiện. Menu sẽ tự mở thêm trang.",
    ],
  },
  {
    id: "media",
    title: "Ban Truyền thông",
    lead: "Phụ trách nội dung, poster, caption và lịch đăng. Mọi bài tạo ra đều phải gắn ngày giờ — Hub ghi vào Lịch CLB.",
    can: [
      "Media Center: tạo content (poster, caption, video, reel, story, recap, tuyển quân…). Bắt buộc chọn ngày giờ đăng; thiếu lịch thì không lưu được.",
      "Gắn content với một sự kiện (nếu có), chọn nền tảng Facebook / Instagram / TikTok / khác, chọn trạng thái từ Ý tưởng → Chờ duyệt → Lên lịch / Đã đăng.",
      "Duyệt content: chấp nhận, từ chối hoặc yêu cầu sửa (khi từ chối / yêu cầu sửa phải ghi chú).",
      "Xóa content mình quản lý (xóa mềm — biến khỏi danh sách).",
      "Thông báo: đăng bảng tin; hệ thống gửi thông báo tới mọi thành viên.",
      "Lịch: xem sự kiện + các bài đã đặt lịch đăng.",
      "Công việc: xem bảng việc (nếu được giao). Không tạo việc mới.",
      "Thống kê: xem sĩ số theo ban và nhật ký hoạt động gần đây.",
      "Điểm danh: xem QR và bật/tắt nhận điểm danh từng sự kiện (hỗ trợ ban tổ chức lúc diễn ra).",
      "Tất cả quyền của Ban Thành viên (sự kiện đã công bố, khóa public, hồ sơ…).",
    ],
    cannot: [
      "Không tạo, sửa, xóa, công bố sự kiện — đó là Ban Sự kiện / Ban Chủ nhiệm.",
      "Không tạo khóa học hay bài học — đó là Ban Học thuật.",
      "Không tạo công việc (task), không phân người vào ban, không đổi quyền / xóa thành viên.",
      "Không đổi họ tên, MSSV, email của người khác.",
      "Không xem sự kiện còn nháp nếu Ban Sự kiện chưa công bố.",
    ],
    how: [
      "Vào Media → Tạo content → điền tiêu đề, nền tảng, loại → chọn Ngày giờ đăng (lịch) → lưu. Bài sẽ xuất hiện trên Lịch đúng khung giờ đó.",
      "Khi poster xong: đổi trạng thái sang Chờ duyệt. Người có quyền duyệt bấm duyệt / yêu cầu sửa ngay trên thẻ.",
      "Cần loan tin gấp: vào Thông báo, viết bảng tin. Đừng dùng Media Center để thay bảng tin nội bộ.",
    ],
  },
  {
    id: "academic",
    title: "Ban Học thuật",
    lead: "Phụ trách khóa tiếng Nhật: giáo trình, video, tài liệu. Khóa mới mặc định chưa công bố.",
    can: [
      "Khóa học: tạo khóa, sửa tiêu đề / mô tả, công bố hoặc ẩn lại, xóa mềm khóa.",
      "Trong từng khóa: thêm bài học loại Video (link Google Drive + mô tả) hoặc Tài liệu (link + ghi chú).",
      "Xóa từng bài học khi đăng nhầm.",
      "Lịch, Công việc (xem việc được giao), Thống kê, Điểm danh (QR + bật/tắt check-in).",
      "Tất cả quyền xem của Ban Thành viên.",
    ],
    cannot: [
      "Không vào Media Center, không tạo poster / caption / lịch đăng bài.",
      "Không đăng bảng tin toàn CLB.",
      "Không tạo hay xóa sự kiện, không công bố sự kiện.",
      "Không tạo công việc, không phân ban, không đổi quyền hay hồ sơ người khác.",
      "Không dán link video ngoài Google Drive.",
    ],
    how: [
      "Khóa học → Tạo khóa → điền tên, mô tả. Khóa lúc này chỉ ban mình và Ban Chủ nhiệm thấy.",
      "Bấm vào khóa → thêm bài (Video hoặc Tài liệu). Kiểm tra xem thử trên tài khoản của mình.",
      "Khi sẵn sàng cho cả CLB: bật công bố. Thành viên thường sẽ thấy khóa trên menu Khóa học.",
      "Rút khóa: tắt công bố. Không cần xóa nếu còn dùng lại.",
    ],
  },
  {
    id: "event",
    title: "Ban Sự kiện",
    lead: "Tổ chức hoạt động, hậu cần và điểm danh. Bạn thấy cả sự kiện chưa công bố — thành viên thường thì không.",
    can: [
      "Sự kiện: tạo sự kiện (tiêu đề, loại, thời gian, địa điểm, mô tả, ảnh bìa, giới hạn số người).",
      "Xem toàn bộ sự kiện kể cả nháp / nội bộ. Bấm vào từng sự kiện để xem người tham gia và ai đã điểm danh.",
      "Công bố hoặc ẩn sự kiện (công tắc công khai). Chỉ sự kiện công khai mới hiện với Ban Thành viên.",
      "Xóa sự kiện (xóa mềm).",
      "Điểm danh: hiện mã QR, bật/tắt «Nhận thêm điểm danh». Tắt khi buổi đã chốt danh sách.",
      "Đăng ký hộ: trong sự kiện, dán một MSSV hoặc chuỗi MSSV cách nhau bằng dấu phẩy để thêm vào danh sách. Không cần thành viên tự bấm tham gia.",
      "Lịch: mọi sự kiện bạn tạo (kể cả chưa công bố) đều nằm đây.",
      "Công việc (xem), Thống kê, và quyền xem của Ban Thành viên.",
    ],
    cannot: [
      "Không tạo content Media, không đăng bảng tin toàn CLB.",
      "Không tạo khóa học.",
      "Không tạo công việc, không phân ban, không đổi quyền / xóa thành viên, không sửa giấy tờ tùy thân người khác.",
      "Không điểm danh hộ bằng cách tự ghi tên — thành viên phải quét QR khi cổng đang mở.",
    ],
    how: [
      "Trước ngày diễn ra: tạo sự kiện, để chế độ chưa công bố nếu còn nháp. Khi chốt, bật công khai.",
      "Trong buổi: mở Điểm danh → bật nhận điểm danh → đưa QR (hoặc link /checkin/…) cho thành viên. Theo dõi số đã điểm danh trên thẻ sự kiện.",
      "Sau buổi: tắt nhận điểm danh để không ai quét thêm. Vào chi tiết sự kiện để đối chiếu danh sách tham gia / có mặt.",
      "Hủy buổi: đổi trạng thái hoặc xóa mềm. Đừng để sự kiện công khai nếu đã hủy.",
    ],
  },
  {
    id: "bcn",
    title: "Ban Chủ nhiệm",
    lead: "Điều hành nhân sự, việc, và quyền công bố. Menu hiện đủ mọi trang.",
    can: [
      "Thành viên: đổi vai trò (Thành viên / Phó chủ nhiệm / Chủ nhiệm), đổi trạng thái (hoạt động, chờ duyệt, tạm nghỉ, cựu thành viên), xóa tài khoản người khác (không xóa chính mình, không xóa Chủ nhiệm cuối).",
      "Ban: gán người vào ban, chọn chức vụ Trưởng ban / Phó ban / Thành viên, gỡ khỏi ban.",
      "Công việc: tạo task, gán người, hạn, độ ưu tiên, chuyển cột Cần làm → Đang làm → Chờ duyệt → Hoàn thành, bình luận, xóa mềm.",
      "Mọi quyền của Truyền thông (Media + bảng tin), Học thuật (khóa học) và Sự kiện (tạo / công bố / QR).",
      "Thống kê: sĩ số từng ban, trạng thái thành viên, tiến độ việc, nhật ký thao tác.",
      "Lịch đầy đủ: sự kiện + bài đăng đã lên lịch.",
      "Chat: xóa từng tin hoặc xóa toàn bộ khung chat. Xem số lần vi phạm chat trên hồ sơ thành viên.",
    ],
    cannot: [
      "Không xuất Excel danh sách thành viên. Nút đó chỉ Chủ nhiệm và Phó chủ nhiệm thấy.",
      "Không xóa tài khoản của chính mình.",
      "Không xóa Chủ nhiệm cuối cùng của CLB.",
      "Đổi họ tên / MSSV / ngày sinh / email đăng nhập của người khác: chỉ Chủ nhiệm hoặc Trưởng ban Chủ nhiệm, không phải mọi thành viên Ban Chủ nhiệm.",
      "Không vượt giới hạn hệ thống: tên 30 ký tự, MSSV 10, tiêu đề 100, mô tả 2000, video 8MB, tệp chat 2MB.",
    ],
    how: [
      "Thành viên mới xong form đăng ký sẽ vào Ban Thành viên. Vào Ban → chọn ban chuyên môn → gán người + chức vụ. Menu của họ sẽ đổi ngay sau khi tải lại.",
      "Việc tuần: Công việc → tạo task → gán đúng người. Việc quá hạn hiện trên Dashboard.",
      "Công bố: sự kiện và khóa học mặc định chưa public. Chỉ bật khi nội dung đã chốt — thành viên thường mới nhìn thấy.",
      "Sự cố điểm danh: trang Điểm danh, bật lại công tắc, đưa QR. Mỗi người chỉ điểm danh một lần / một sự kiện.",
    ],
  },
  {
    id: "president",
    title: "Chủ nhiệm",
    lead: "Thêm một lớp giấy tờ tùy thân. Phó chủ nhiệm điều hành được nhân sự nhưng không sửa giấy tờ.",
    can: [
      "Mọi quyền Ban Chủ nhiệm.",
      "Xuất Excel thành viên (họ tên, MSSV, email, ban) trên trang Thành viên. Chọn một ban hoặc tất cả, và chọn có lấy cựu thành viên hay không. Phó chủ nhiệm cũng xuất được.",
      "Vào chi tiết thành viên: sửa họ tên, MSSV, ngày sinh, email đăng nhập hộ khi đăng ký sai.",
      "Trưởng ban Chủ nhiệm cũng được sửa giấy tờ — dùng khi Chủ nhiệm vắng.",
    ],
    cannot: [
      "Không ủy quyền việc sửa giấy tờ cho Phó chủ nhiệm hay trưởng ban khác.",
      "Không để CLB không còn Chủ nhiệm: hệ thống chặn xóa / hạ vai trò nếu đó là Chủ nhiệm cuối.",
    ],
    how: [
      "Thành viên báo sai MSSV / email: Thành viên → bấm tên người đó → sửa đúng ô → lưu. Họ đăng nhập bằng email mới từ lần sau.",
      "Bàn giao: gán người kế nhiệm vai trò Chủ nhiệm trước, rồi mới hạ vai trò của mình.",
    ],
  },
];

function Guide() {
  const { data, loading } = useRpc(() => getMe());
  if (loading || !data) return <p className="text-muted">Đang tải hướng dẫn…</p>;
  const ids = new Set(["common", "members"]);
  if (data.inMedia) ids.add("media");
  if (data.inAcademic) ids.add("academic");
  if (data.inEvent) ids.add("event");
  if (data.inBcn || data.isAdmin) {
    ids.add("bcn");
    ids.add("media");
    ids.add("academic");
    ids.add("event");
  }
  if (data.isPresident || data.canEditIdentity) ids.add("president");
  const shown = BLOCKS.filter((b) => ids.has(b.id));

  return (
    <div>
      <PageHeader
        kicker="Cẩm nang"
        title="Hướng dẫn"
        desc="Bộ luật chung cho mọi thành viên, rồi hướng dẫn theo ban — được làm gì, không được làm gì."
      />
      <article className="card-paper mb-3 p-6">
        <p className="kicker">Nội quy</p>
        <h2 className="mt-1 font-display text-2xl">Bộ luật Nigoto Hub</h2>
        <p className="mt-2 text-muted">
          Áp dụng cho tất cả tài khoản. Đăng nhập là đã đọc và chấp hành. Ban Chủ nhiệm được giải thích và xử lý khi có tranh chấp.
        </p>
        <ol className="mt-5 space-y-5">
          {LAWS.map((ch) => (
            <li key={ch.chapter}>
              <p className="font-semibold text-ink">{ch.chapter}</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
                {ch.articles.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </article>
      <div className="space-y-3">
        {shown.map((b) => (
          <article key={b.id} className="card-paper p-6">
            <h2 className="font-display text-2xl">{b.title}</h2>
            <p className="mt-2 text-muted">{b.lead}</p>
            <Section kicker="Được làm" items={b.can} />
            <Section kicker="Không làm được" items={b.cannot} />
            <Section kicker="Cách làm" items={b.how} />
          </article>
        ))}
      </div>
    </div>
  );
}

function Section({ kicker, items }: { kicker: string; items: string[] }) {
  return (
    <div className="mt-5">
      <p className="kicker">{kicker}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
