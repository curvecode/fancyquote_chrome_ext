interface ClipData {
  text: string;
  url: string;
  timestamp: number;
}

class LanguageManager {
  private currentLanguage: string = 'en';
  private translations: { [key: string]: { [key: string]: string } } = {};

  constructor() {
    this.loadSavedLanguage();
  }

  async loadSavedLanguage() {
    try {
      const result = await chrome.storage.sync.get('selectedLanguage');
      if (result.selectedLanguage) {
        this.currentLanguage = result.selectedLanguage;
      } else {
        const browserLang = navigator.language.split('-')[0];
        if (['en', 'vi', 'cs'].includes(browserLang)) {
          this.currentLanguage = browserLang;
        }
      }
      await this.loadTranslations();
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  }

  async loadTranslations() {
    try {
      const response = await fetch(`_locales/${this.currentLanguage}/messages.json`);
      const data = await response.json();
      
      this.translations[this.currentLanguage] = {};
      for (const key in data) {
        this.translations[this.currentLanguage][key] = data[key].message;
      }
    } catch (error) {
      console.error('Error loading translations:', error);
      if (this.currentLanguage !== 'en') {
        this.currentLanguage = 'en';
        await this.loadTranslations();
      }
    }
  }

  getMessage(key: string, substitutions?: string[]): string {
    let message = this.translations[this.currentLanguage]?.[key] || key;
    
    if (substitutions && substitutions.length > 0) {
      substitutions.forEach((sub, index) => {
        const placeholder = `$${index + 1}`;
        message = message.replace(new RegExp(`\\$${index + 1}|\\$${key.toUpperCase()}\\$`, 'g'), sub);
        message = message.replace(`$COUNT$`, sub);
        message = message.replace(`$MENU_TITLE$`, sub);
      });
    }
    
    return message;
  }

  async setLanguage(language: string) {
    if (['en', 'vi', 'cs'].includes(language)) {
      this.currentLanguage = language;
      await chrome.storage.sync.set({ selectedLanguage: language });
      await this.loadTranslations();
      return true;
    }
    return false;
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }
}

class PopupManager {
  private clipsContainer: HTMLElement;
  private clipCountElement: HTMLElement;
  private refreshBtn: HTMLElement;
  private clearBtn: HTMLElement;
  private exportBtn: HTMLElement;
  private languageSelect: HTMLSelectElement;
  private languageManager: LanguageManager;
  private editConfigBtn!: HTMLElement;
  private configPanel!: HTMLElement;
  private saveConfigBtn!: HTMLElement;
  private cancelConfigBtn!: HTMLElement;
  private maxTruncateInput!: HTMLInputElement;
  private maxClipsInput!: HTMLInputElement;

  private settings = {
    maxTruncate: 150,
    maxClips: 200
  };
  private configPanelOpen = false;

  constructor() {
    this.clipsContainer = document.getElementById('clipsContainer')!;
    this.clipCountElement = document.getElementById('clipCount')!;
    this.refreshBtn = document.getElementById('refreshBtn')!;
    this.clearBtn = document.getElementById('clearBtn')!;
    this.exportBtn = document.getElementById('exportBtn')!;
    this.languageSelect = document.getElementById('languageSelect')! as HTMLSelectElement;
    this.languageManager = new LanguageManager();

    this.init();
  }

  async init() {
    await this.languageManager.loadSavedLanguage();
    this.initializeLanguageSelector();
    this.initializeI18n();
    this.setupEventListeners();
    await this.loadSettings();
    await this.loadConfigPanelState();
    await this.loadClips();
  }

  initializeLanguageSelector() {
    const currentLang = this.languageManager.getCurrentLanguage();
    this.languageSelect.value = currentLang;
  }

  initializeI18n() {
    const popupTitle = document.getElementById('popupTitle')!;
    const refreshBtn = document.getElementById('refreshBtn')!;
    const clearBtn = document.getElementById('clearBtn')!;
    const exportBtn = document.getElementById('exportBtn')!;
    const loadingText = document.getElementById('loadingText')!;

    if (popupTitle) popupTitle.textContent = this.languageManager.getMessage("popupTitle");
    if (refreshBtn) refreshBtn.textContent = this.languageManager.getMessage("refreshButton");
    if (clearBtn) clearBtn.textContent = this.languageManager.getMessage("clearAllButton");
    if (exportBtn) exportBtn.textContent = this.languageManager.getMessage("exportButton");
    if (loadingText) loadingText.textContent = this.languageManager.getMessage("loadingText");
  }

  setupEventListeners() {
    this.refreshBtn.addEventListener('click', () => this.loadClips());
    this.clearBtn.addEventListener('click', () => this.clearAllClips());
    this.exportBtn.addEventListener('click', () => this.exportClips());
    this.languageSelect.addEventListener('change', (e) => this.handleLanguageChange(e));

    // Config UI wiring
    this.editConfigBtn = document.getElementById('editConfigBtn')!;
    this.configPanel = document.getElementById('configPanel')!;
    this.saveConfigBtn = document.getElementById('saveConfigBtn')!;
    this.cancelConfigBtn = document.getElementById('cancelConfigBtn')!;
    this.maxTruncateInput = document.getElementById('maxTruncate') as HTMLInputElement;
    this.maxClipsInput = document.getElementById('maxClips') as HTMLInputElement;

    this.editConfigBtn.addEventListener('click', () => this.toggleConfigPanel());
    this.saveConfigBtn.addEventListener('click', () => this.saveSettings());
    this.cancelConfigBtn.addEventListener('click', () => this.hideConfigPanel());
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['settings']);
      const s = result.settings || {};
      this.settings.maxTruncate = s.maxTruncate ?? this.settings.maxTruncate;
      this.settings.maxClips = s.maxClips ?? this.settings.maxClips;

      if (this.maxTruncateInput) this.maxTruncateInput.value = String(this.settings.maxTruncate);
      if (this.maxClipsInput) this.maxClipsInput.value = String(this.settings.maxClips);
    } catch (error) {
      console.error('Error loading settings', error);
    }
  }

  toggleConfigPanel() {
    if (!this.configPanel) return;
    this.configPanelOpen = !this.configPanelOpen;
    this.configPanel.style.display = this.configPanelOpen ? 'block' : 'none';
    if (this.configPanelOpen) {
      if (this.maxTruncateInput) this.maxTruncateInput.value = String(this.settings.maxTruncate);
      if (this.maxClipsInput) this.maxClipsInput.value = String(this.settings.maxClips);
    }
    // persist state
    chrome.storage.sync.set({ configPanelOpen: this.configPanelOpen }).catch(() => {});
  }

  hideConfigPanel() {
    if (!this.configPanel) return;
    this.configPanel.style.display = 'none';
    this.configPanelOpen = false;
    chrome.storage.sync.set({ configPanelOpen: false }).catch(() => {});
  }

  async loadConfigPanelState() {
    try {
      const result = await chrome.storage.sync.get('configPanelOpen');
      if (result.configPanelOpen) {
        this.configPanelOpen = true;
        if (this.configPanel) this.configPanel.style.display = 'block';
      } else {
        this.configPanelOpen = false;
        if (this.configPanel) this.configPanel.style.display = 'none';
      }
    } catch (error) {
      console.error('Error loading config panel state', error);
    }
  }

  async saveSettings() {
    if (!this.maxTruncateInput || !this.maxClipsInput) return;
    const newMaxTruncate = parseInt(this.maxTruncateInput.value || String(this.settings.maxTruncate), 10);
    const newMaxClips = parseInt(this.maxClipsInput.value || String(this.settings.maxClips), 10);

    this.settings.maxTruncate = Math.max(10, Math.min(5000, isNaN(newMaxTruncate) ? this.settings.maxTruncate : newMaxTruncate));
    this.settings.maxClips = Math.max(1, Math.min(5000, isNaN(newMaxClips) ? this.settings.maxClips : newMaxClips));

    try {
      await chrome.storage.sync.set({ settings: this.settings });
      this.showToast(this.languageManager.getMessage('toastSettingsSaved') || 'Settings saved');
      this.hideConfigPanel();
      await this.loadClips();
    } catch (error) {
      console.error('Error saving settings', error);
      this.showToast(this.languageManager.getMessage('toastSettingsSaveError') || 'Failed to save settings', 'error');
    }
  }

  async handleLanguageChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const selectedLanguage = target.value;
    
    const success = await this.languageManager.setLanguage(selectedLanguage);
    if (success) {
      this.initializeI18n();
      await this.loadClips();
      
      try {
        await chrome.runtime.sendMessage({ 
          action: "updateLanguage", 
          language: selectedLanguage 
        });
      } catch (error) {
        console.log("Background script will automatically detect language change via storage");
      }
      
      this.showToast(this.languageManager.getMessage("languageChanged") || "Language changed successfully!");
    }
  }

  async loadClips() {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      
      this.updateClipCount(clips.length);
      this.renderClips(clips);
    } catch (error) {
      console.error('Error loading clips:', error);
      this.showError('Failed to load clips');
    }
  }

  updateClipCount(count: number) {
    this.clipCountElement.textContent = this.languageManager.getMessage("statsText", [count.toString()]);
  }

  renderClips(clips: ClipData[]) {
    if (clips.length === 0) {
      this.showEmptyState();
      return;
    }

    const sortedClips = clips.sort((a, b) => b.timestamp - a.timestamp);
    const max = this.settings?.maxClips ?? 200;
    const limited = sortedClips.slice(0, max);

    this.clipsContainer.innerHTML = limited
      .map((clip, index) => this.createClipHTML(clip, index))
      .join('');

    this.attachClipEventListeners();
  }

  createClipHTML(clip: ClipData, index: number): string {
    const date = new Date(clip.timestamp);
    const timeAgo = this.formatTimeAgo(date);
    const domain = this.extractDomain(clip.url);
    
    const truncLen = this.settings?.maxTruncate ?? 150;
    const truncatedText = clip.text.length > truncLen
      ? clip.text.substring(0, truncLen) + '...'
      : clip.text;

    return `
      <div class="clip-item" data-index="${index}">
        <div class="clip-text">${this.escapeHtml(truncatedText)}</div>
        <div class="clip-meta">
          <a href="${clip.url}" class="clip-url" target="_blank" title="${clip.url}">
            ${domain}
          </a>
          <div class="clip-actions">
            <button class="action-btn copy-btn" data-index="${index}" title="Copy to clipboard">📋</button>
            <button class="action-btn delete-btn" data-index="${index}" title="Delete">🗑️</button>
            <span style="font-size: 10px; margin-left: 5px;">${timeAgo}</span>
          </div>
        </div>
      </div>
    `;
  }

  attachClipEventListeners() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index!);
        await this.copyClipText(index);
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index!);
        await this.deleteClip(index);
      });
    });
  }

  async copyClipText(index: number) {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      const sortedClips = clips.sort((a, b) => b.timestamp - a.timestamp);
      
      if (sortedClips[index]) {
        await navigator.clipboard.writeText(sortedClips[index].text);
        this.showToast(this.languageManager.getMessage("toastCopied"));
      }
    } catch (error) {
      console.error('Error copying text:', error);
      this.showToast(this.languageManager.getMessage("toastCopyError"), 'error');
    }
  }

  async deleteClip(index: number) {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      const sortedClips = clips.sort((a, b) => b.timestamp - a.timestamp);
      
      if (sortedClips[index]) {
        const clipToDelete = sortedClips[index];
        const originalIndex = clips.findIndex(clip => 
          clip.timestamp === clipToDelete.timestamp && 
          clip.text === clipToDelete.text
        );
        
        if (originalIndex !== -1) {
          clips.splice(originalIndex, 1);
          await chrome.storage.sync.set({ clips });
          await this.loadClips();
          this.showToast(this.languageManager.getMessage("toastDeleted"));
        }
      }
    } catch (error) {
      console.error('Error deleting clip:', error);
      this.showToast(this.languageManager.getMessage("toastDeleteError"), 'error');
    }
  }

  async clearAllClips() {
    const confirmMessage = this.languageManager.getMessage("confirmClearAll");
    if (confirm(confirmMessage)) {
      try {
        await chrome.storage.sync.set({ clips: [] });
        await this.loadClips();
        this.showToast(this.languageManager.getMessage("toastAllDeleted"));
      } catch (error) {
        console.error('Error clearing clips:', error);
        this.showToast(this.languageManager.getMessage("toastClearError"), 'error');
      }
    }
  }

  async exportClips() {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      
      if (clips.length === 0) {
        this.showToast(this.languageManager.getMessage("toastNoClipsToExport"));
        return;
      }

      const exportData = clips.map(clip => ({
        text: clip.text,
        url: clip.url,
        date: new Date(clip.timestamp).toISOString()
      }));

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `text-clipper-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      this.showToast(this.languageManager.getMessage("toastExported"));
    } catch (error) {
      console.error('Error exporting clips:', error);
      this.showToast(this.languageManager.getMessage("toastExportError"), 'error');
    }
  }

  showEmptyState() {
    const contextMenuTitle = this.languageManager.getMessage("contextMenuTitle");
    this.clipsContainer.innerHTML = `
      <div class="empty-state">
        <h3>${this.languageManager.getMessage("emptyStateTitle")}</h3>
        <p>${this.languageManager.getMessage("emptyStateDescription", [contextMenuTitle])}</p>
      </div>
    `;
  }

  showError(message: string) {
    this.clipsContainer.innerHTML = `
      <div class="empty-state">
        <h3>${this.languageManager.getMessage("errorTitle")}</h3>
        <p>${message}</p>
      </div>
    `;
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      background: ${type === 'error' ? '#e74c3c' : '#27ae60'};
      color: white;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    toast.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.remove();
      style.remove();
    }, 3000);
  }

  formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return this.languageManager.getMessage("timeAgoNow");
    if (diffMins < 60) return this.languageManager.getMessage("timeAgoMinutes", [diffMins.toString()]);
    if (diffHours < 24) return this.languageManager.getMessage("timeAgoHours", [diffHours.toString()]);
    if (diffDays < 7) return this.languageManager.getMessage("timeAgoDays", [diffDays.toString()]);
    
    return date.toLocaleDateString();
  }

  extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});