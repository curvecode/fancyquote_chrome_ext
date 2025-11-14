interface ClipData {
  text: string;
  url: string;
  timestamp: number;
}

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
    }
  }

  getMessage(key: string, substitutions?: string[]): string {
    let message = this.translations[this.currentLanguage]?.[key];
    
    if (!message) {
      try {
        message = chrome.i18n.getMessage(key, substitutions);
      } catch (error) {
        console.error('Error getting i18n message:', error);
      }
    }
    
    return message || key;
  }

  createContextMenu() {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "saveSelectedText",
        title: this.getMessage("contextMenuTitle"),
        contexts: ["selection"]
      });
    });
  }

  setupLanguageChangeListener() {
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
      if (namespace === 'sync' && changes.selectedLanguage) {
        const newLanguage = changes.selectedLanguage.newValue;
        if (newLanguage && newLanguage !== this.currentLanguage) {
          this.currentLanguage = newLanguage;
          await this.loadTranslations();
          this.createContextMenu();
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

chrome.runtime.onInstalled.addListener(async () => {
  await backgroundLangManager.init();
});

chrome.runtime.onStartup.addListener(async () => {
  await backgroundLangManager.init();
});

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "updateLanguage") {
    await backgroundLangManager.updateLanguage(message.language);
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "saveSelectedText" && tab?.id) {
    try {
      await ensureContentScriptInjected(tab.id);

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSelectedText",
      });

      if (response && response.text) {
        const data: ClipData = {
          text: response.text,
          url: response.url,
          timestamp: Date.now(),
        };

        await saveLocally(data);

        chrome.notifications.create({
          type: "basic",
          iconUrl: "icons/icon48.png",
          title: backgroundLangManager.getMessage("extensionName"),
          message: backgroundLangManager.getMessage("notificationSuccess"),
        });
      } else {
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

async function ensureContentScriptInjected(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { action: "ping" });
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["content.js"],
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function saveLocally(data: ClipData) {
  try {
    const result = await chrome.storage.sync.get("clips");
    const existingClips: ClipData[] = result.clips || [];
    existingClips.push(data);
    const updatedClips = existingClips.slice(-100);
    await chrome.storage.sync.set({ clips: updatedClips });
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
