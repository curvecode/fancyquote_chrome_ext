// src/background.ts

interface ClipData {
  text: string;
  url: string;
  timestamp: number;
}

// 1. Tạo mục trong Menu Chuột Phải
chrome.runtime.onInstalled.addListener(() => {
chrome.contextMenus.create({
    id: "saveSelectedText",
    title: "Save this text",
    contexts: ["selection"], // Only show when text is selected
});
});

// 2. Lắng nghe sự kiện từ Menu Chuột Phải
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveSelectedText" && tab?.id) {
    try {
      // Inject content script if needed
      await ensureContentScriptInjected(tab.id);

      // Gửi yêu cầu đến content script để lấy text và URL
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSelectedText",
      });

      if (response && response.text) {
        const data: ClipData = {
          text: response.text,
          url: response.url,
          timestamp: Date.now(),
        };

        // Bắt đầu quá trình lưu trữ
        await saveLocally(data);
        // Hoặc: await saveToGoogleDrive(data);

        console.log("Dữ liệu đã được lưu:", data);

        // Show notification to user
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon16.png",
          title: "Text Clipper",
          message: "Text saved successfully!",
        });
      } else {
        console.log("No text was selected.");
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icon16.png",
          title: "Text Clipper",
          message: "No text was selected.",
        });
      }
    } catch (error) {
    console.error("Error sending message:", error);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon16.png",
      title: "Text Clipper",
      message: "An error occurred while saving the text.",
    });
    }
  }
});

// Helper function to ensure content script is injected
async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    // Try to ping the content script first
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
  } catch (error) {
    // If ping fails, inject the content script
    console.log("Content script not found, injecting...");
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    // Wait a bit for the script to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// 3. Hàm Lưu Trữ Dữ liệu Cục Bộ (Sử dụng chrome.storage.sync)
async function saveLocally(data: ClipData) {
  try {
    const result = await chrome.storage.sync.get("clips");
    const existingClips: ClipData[] = result.clips || [];

    existingClips.push(data);

    // Giới hạn số lượng clip để tránh vượt quá giới hạn sync storage (tùy chọn)
    const updatedClips = existingClips.slice(-100);

    await chrome.storage.sync.set({ clips: updatedClips });
    console.log("Saved locally!");
  } catch (error) {
    console.error("Error saving locally:", error);
  }
}

async function getDriveAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve((token as string) || null);
      }
    });
  });
}
