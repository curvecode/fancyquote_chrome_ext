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
    title: "Lưu đoạn Text này",
    contexts: ["selection"] // Chỉ hiện khi có text được chọn
  });
});

// 2. Lắng nghe sự kiện từ Menu Chuột Phải
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveSelectedText" && tab?.id) {
    try {
      // Inject content script if needed
      await ensureContentScriptInjected(tab.id);
      
      // Gửi yêu cầu đến content script để lấy text và URL
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getSelectedText" });

      if (response && response.text) {
        const data: ClipData = {
          text: response.text,
          url: response.url,
          timestamp: Date.now()
        };
        
        // Bắt đầu quá trình lưu trữ
        await saveLocally(data); 
        // Hoặc: await saveToGoogleDrive(data);
        
        console.log("Dữ liệu đã được lưu:", data);
        
        // Show notification to user
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon16.png',
          title: 'Text Clipper',
          message: 'Văn bản đã được lưu thành công!'
        });
      } else {
        console.log("Không có văn bản nào được chọn.");
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon16.png',
          title: 'Text Clipper',
          message: 'Không có văn bản nào được chọn.'
        });
      }
    } catch (error) {
      console.error("Lỗi khi gửi message:", error);
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icon16.png',
        title: 'Text Clipper',
        message: 'Có lỗi xảy ra khi lưu văn bản.'
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
      files: ['content.js']
    });
    // Wait a bit for the script to initialize
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 3. Hàm Lưu Trữ Dữ liệu Cục Bộ (Sử dụng chrome.storage.sync)
async function saveLocally(data: ClipData) {
  try {
    const result = await chrome.storage.sync.get('clips');
    const existingClips: ClipData[] = result.clips || [];
    
    existingClips.push(data);
    
    // Giới hạn số lượng clip để tránh vượt quá giới hạn sync storage (tùy chọn)
    const updatedClips = existingClips.slice(-100); 

    await chrome.storage.sync.set({ clips: updatedClips });
    console.log("Đã lưu cục bộ!");
  } catch (error) {
    console.error("Lỗi khi lưu cục bộ:", error);
  }
}

async function getDriveAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(token as string || null);
      }
    });
  });
}