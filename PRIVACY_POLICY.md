PRIVACY POLICY — FancyQuote (English / Vietnamese)

---

ENGLISH

Overview
- This extension saves text snippets ("clips") that you explicitly select on web pages so you can view, copy, export, or manage them from the popup UI. This document explains which permissions the extension requests and why.

Permissions and purpose
- `storage`
  - Purpose: Store saved text clips, user settings (max truncate length, maximum clip list size), language choice, and UI state (e.g., whether the config panel was open).
  - Data scope: Data is stored in the browser using `chrome.storage`. If the user has Chrome Sync enabled, Chrome may synchronize storage across the user's signed-in devices; the extension itself does not initiate cross-device transfers to external servers.

- `activeTab`
  - Purpose: Allow the extension to access the active tab in response to a direct user action (e.g., context menu click or pressing the extension action). This permits injecting or messaging a content script only when the user interacts, which reduces required scope compared with always-on host permissions.

- `contextMenus`
  - Purpose: Add the "Save selected text" item to the page context menu. This is how users explicitly save the text selection to the extension.

- `scripting`
  - Purpose: Inject or execute the content script (`content.js`) at runtime in a tab when needed (for example when the user clicks the context menu). This enables retrieving the currently selected text from the page DOM.

- `notifications`
  - Purpose: Provide small user feedback (success, failure, or informational notifications) when actions such as "save" occur.

- `content_scripts` with `matches: ["<all_urls>"]`
  - Purpose: When configured this way, the extension's `content.js` is automatically injected across matching pages so the content script is always present and ready to answer messages (such as `getSelectedText`) from the background/service worker. This is the simplest approach to ensure the content script responds reliably.
  - Privacy note: The content script's only job is to read text explicitly selected by the user; it does not collect or transmit browsing history, form data, or other page content unless the user has selected that text and requested saving.
  - Reviewer note: Because `matches: ["<all_urls>"]` gives the extension the ability to run on many pages, Chrome's reviewer may request a justification. If desired, the extension can be changed to NOT auto-inject on all pages and instead inject the content script at runtime only in response to user actions (using `scripting.executeScript` + `activeTab`). That approach reduces the apparent permission scope and is recommended to minimize reviewer friction.

Data collection and sharing
- What is collected: only text explicitly selected by the user and metadata stored alongside it (page URL and timestamp).
- Where it is stored: in the browser via `chrome.storage` (the extension does not transmit saved clips to external servers by default).
- Sharing: The extension does NOT automatically send saved text to any remote server, analytics provider, or third party.
- Optional cloud export/sync: Exporting saves a JSON file locally (download). Any cloud sync/upload feature (for example uploading to Google Drive) requires an explicit user action and OAuth consent; such features are disabled unless the user authorizes them. Note: if OAuth upload is implemented, additional permissions (e.g., `identity`/OAuth client) and clear consent flows will be required.

User control and data removal
- The user can delete saved clips via the popup UI (Clear All or delete per-item).
- The user can export clips and then delete them locally.
- To remove all stored data, uninstall the extension and clear extension storage via Chrome settings.

Contact
- If you have privacy questions or need to request removal of data, please open an issue in the repository or contact the developer at the repository listed on the Chrome Web Store listing.

---

TIẾNG VIỆT

Tổng quan
- Extension này lưu các đoạn văn bản ("clip") mà bạn chủ động chọn trên trang web để bạn có thể xem, sao chép, xuất hoặc quản lý từ cửa sổ popup. Tài liệu này giải thích các quyền extension yêu cầu và lý do.

Quyền và mục đích
- `storage`
  - Mục đích: Lưu các đoạn văn bản đã lưu, cài đặt người dùng (độ dài rút gọn, số lượng clip tối đa), ngôn ngữ, và một số trạng thái UI (ví dụ panel cấu hình đang mở hay đóng).
  - Phạm vi dữ liệu: Dữ liệu được lưu trong trình duyệt bằng `chrome.storage`. Nếu người dùng bật Chrome Sync, dữ liệu có thể được đồng bộ qua các thiết bị của người dùng do Chrome thực hiện; chính extension không gửi dữ liệu đến máy chủ bên ngoài.

- `activeTab`
  - Mục đích: Cho phép extension truy cập tab đang hoạt động khi có hành động trực tiếp của người dùng (ví dụ click menu ngữ cảnh hoặc nút action). Điều này cho phép chèn hoặc gửi message tới content script chỉ khi người dùng yêu cầu, giảm phạm vi quyền so với chèn tự động trên mọi trang.

- `contextMenus`
  - Mục đích: Thêm mục menu ngữ cảnh "Save selected text" để người dùng có thể lưu văn bản đã chọn.

- `scripting`
  - Mục đích: Chèn hoặc chạy content script (`content.js`) khi cần (ví dụ khi người dùng nhấn lưu). Cách này giúp extension đọc văn bản đang được chọn trong DOM của trang.

- `notifications`
  - Mục đích: Hiển thị thông báo nhỏ cho người dùng khi hành động (lưu thành công/thất bại) xảy ra.

- `content_scripts` với `matches: ["<all_urls>"]`
  - Mục đích: Khi cấu hình như vậy, `content.js` tự động được chèn vào các trang khớp, giúp script luôn sẵn sàng trả lời message (ví dụ `getSelectedText`) từ background/service worker. Đây là cách đơn giản nhất để đảm bảo content script luôn có mặt.
  - Ghi chú quyền riêng tư: Nội dung script chỉ đọc văn bản mà người dùng chủ động chọn; nó không thu thập hay gửi lịch sử duyệt, dữ liệu biểu mẫu hoặc nội dung trang khác nếu người dùng không chọn chúng và yêu cầu lưu.
  - Ghi chú cho reviewer: Vì `matches: ["<all_urls>"]` cho phép chạy trên nhiều trang, reviewer của Chrome có thể yêu cầu lý do. Nếu muốn giảm phạm vi, có thể chuyển sang chèn runtime (runtime injection) chỉ khi người dùng tương tác (sử dụng `scripting.executeScript` và `activeTab`). Cách này giảm phạm vi quyền cần thiết.

Thu thập dữ liệu và chia sẻ
- Dữ liệu thu thập: chỉ văn bản mà người dùng chủ động chọn, kèm metadata (URL trang và thời gian lưu).
- Nơi lưu: trong trình duyệt bằng `chrome.storage` (extension không gửi các clip đã lưu tới máy chủ bên ngoài theo mặc định).
- Chia sẻ: Extension không tự động gửi dữ liệu tới máy chủ, nhà cung cấp phân tích, hay bên thứ ba.
- Xuất/đồng bộ đám mây tùy chọn: Khi người dùng xuất, extension tạo file JSON để tải về cục bộ. Mọi tính năng upload/đồng bộ đám mây (ví dụ Google Drive) yêu cầu hành động rõ ràng của người dùng và xác nhận OAuth; nếu không được cấp phép thì tính năng không hoạt động.

Quyền kiểm soát của người dùng và xóa dữ liệu
- Người dùng có thể xóa clip đã lưu qua giao diện popup (Xóa tất cả hoặc xóa từng mục).
- Người dùng có thể xuất clip rồi xóa chúng khỏi bộ nhớ local.
- Để xóa toàn bộ dữ liệu, người dùng có thể gỡ cài đặt extension và xoá storage của extension trong cài đặt Chrome.

Liên hệ
- Nếu có câu hỏi về quyền riêng tư hoặc muốn yêu cầu xoá dữ liệu, vui lòng mở issue trên repository hoặc liên hệ với người phát triển theo thông tin trên trang Chrome Web Store.

---

Notes for reviewers / Ghi chú cho người review
- The extension can be adjusted to use runtime injection (only inject at user action) to avoid auto-injecting on all pages. This reduces required host scope and is available if requested.
- Nếu reviewer muốn, chúng tôi có thể gửi bản build thay đổi để loại bỏ `content_scripts.matches` và chỉ inject `content.js` khi người dùng tương tác.
