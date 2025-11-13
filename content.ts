// src/content.ts

// Hàm để lấy văn bản được chọn
function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

// Lắng nghe yêu cầu từ background script (ví dụ: khi người dùng nhấp vào menu chuột phải)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
    // Simple ping response to check if content script is loaded
    sendResponse({ status: "ready" });
    return true;
  }
  
  if (message.action === "getSelectedText") {
    const selectedText = getSelectedText();
    const pageUrl = window.location.href;

    sendResponse({
      text: selectedText,
      url: pageUrl
    });
    return true; // Quan trọng: Báo hiệu rằng sendResponse sẽ được gọi bất đồng bộ
  }
});