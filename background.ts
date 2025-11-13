// src/background.ts

interface ClipData {
  text: string;
  url: string;
  timestamp: number;
}

// Background Language Manager
class BackgroundLanguageManager {
  private currentLanguage: string = 'en';
  private translations: { [key: string]: { [key: string]: string } } = {};

  async init() {
    await this.loadSavedLanguage();
    await this.loadTranslations();
    this.createContextMenu();
    this.setupLanguageChangeListener();
  }

  async loadSavedLanguage() {
    try {
      const result = await chrome.storage.sync.get('selectedLanguage');
      if (result.selectedLanguage) {
        this.currentLanguage = result.selectedLanguage;
      } else {
        // Default to English
        this.currentLanguage = 'en';
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
      this.currentLanguage = 'en';
    }
  }

  async loadTranslations() {
    try {
      const response = await fetch(chrome.runtime.getURL(`_locales/${this.currentLanguage}/messages.json`));
      const data = await response.json();
      
      this.translations[this.currentLanguage] = {};
      for (const key in data) {
        this.translations[this.currentLanguage][key] = data[key].message;
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to chrome.i18n if custom loading fails
    }
  }

  getMessage(key: string, substitutions?: string[]): string {
    // First try custom translations
    let message = this.translations[this.currentLanguage]?.[key];
    
    // Fallback to chrome.i18n
    if (!message) {
      try {
        message = chrome.i18n.getMessage(key, substitutions);
      } catch (error) {
        console.error('Error getting i18n message:', error);
      }
    }
    
    // Final fallback
    return message || key;
  }

  createContextMenu() {
    // Remove existing menu item
    chrome.contextMenus.removeAll(() => {
      // Create new menu item with current language
      chrome.contextMenus.create({
        id: "saveSelectedText",
        title: this.getMessage("contextMenuTitle"),
        contexts: ["selection"]
      });
    });
  }

  setupLanguageChangeListener() {
    // Listen for language changes from storage
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'sync' && changes.selectedLanguage) {
        const newLanguage = changes.selectedLanguage.newValue;
        if (newLanguage && newLanguage !== this.currentLanguage) {
          this.currentLanguage = newLanguage;
          await this.loadTranslations();
          this.createContextMenu(); // Recreate menu with new language
        }
      }
    });
  }

  async updateLanguage(language: string) {
    if (['en', 'vi', 'cs'].includes(language)) {
      this.currentLanguage = language;
      await this.loadTranslations();
      this.createContextMenu();
    }
  }
}

const backgroundLangManager = new BackgroundLanguageManager();

// 1. Initialize context menu with language support
chrome.runtime.onInstalled.addListener(async () => {
  await backgroundLangManager.init();
});

// Also initialize on startup
chrome.runtime.onStartup.addListener(async () => {
  await backgroundLangManager.init();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "updateLanguage") {
    // Use the public updateLanguage method
    await backgroundLangManager.updateLanguage(message.language);
  }
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
          iconUrl: "icons/icon48.png",
          title: backgroundLangManager.getMessage("extensionName"),
          message: backgroundLangManager.getMessage("notificationSuccess"),
        });
      } else {
        console.log("No text was selected.");
        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: backgroundLangManager.getMessage("extensionName"),
          message: backgroundLangManager.getMessage("notificationNoText"),
        });
      }
    } catch (error) {
    console.error("Error sending message:", error);
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: backgroundLangManager.getMessage("extensionName"),
      message: backgroundLangManager.getMessage("notificationError"),
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
