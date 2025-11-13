// popup.js - Script for the extension popup

interface ClipData {
  text: string;
  url: string;
  timestamp: number;
}

class PopupManager {
  private clipsContainer: HTMLElement;
  private clipCountElement: HTMLElement;
  private refreshBtn: HTMLElement;
  private clearBtn: HTMLElement;
  private exportBtn: HTMLElement;

  constructor() {
    this.clipsContainer = document.getElementById('clipsContainer')!;
    this.clipCountElement = document.getElementById('clipCount')!;
    this.refreshBtn = document.getElementById('refreshBtn')!;
    this.clearBtn = document.getElementById('clearBtn')!;
    this.exportBtn = document.getElementById('exportBtn')!;

    this.init();
  }

  async init() {
    await this.loadClips();
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.refreshBtn.addEventListener('click', () => this.loadClips());
    this.clearBtn.addEventListener('click', () => this.clearAllClips());
    this.exportBtn.addEventListener('click', () => this.exportClips());
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
    this.clipCountElement.textContent = `${count} saved clips`;
  }

  renderClips(clips: ClipData[]) {
    if (clips.length === 0) {
      this.showEmptyState();
      return;
    }

    // Sort clips by timestamp (newest first)
    const sortedClips = clips.sort((a, b) => b.timestamp - a.timestamp);

    this.clipsContainer.innerHTML = sortedClips
      .map((clip, index) => this.createClipHTML(clip, index))
      .join('');

    // Add event listeners to action buttons
    this.attachClipEventListeners();
  }

  createClipHTML(clip: ClipData, index: number): string {
    const date = new Date(clip.timestamp);
    const timeAgo = this.formatTimeAgo(date);
    const domain = this.extractDomain(clip.url);
    
    // Truncate text if too long
    const truncatedText = clip.text.length > 150 
      ? clip.text.substring(0, 150) + '...' 
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
    // Copy button handlers
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const index = parseInt((e.target as HTMLElement).dataset.index!);
        await this.copyClipText(index);
      });
    });

    // Delete button handlers
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
        this.showToast('Copied to clipboard!');
      }
    } catch (error) {
      console.error('Error copying text:', error);
      this.showToast('Failed to copy text', 'error');
    }
  }

  async deleteClip(index: number) {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      const sortedClips = clips.sort((a, b) => b.timestamp - a.timestamp);
      
      if (sortedClips[index]) {
        // Find the original index in the unsorted array
        const clipToDelete = sortedClips[index];
        const originalIndex = clips.findIndex(clip => 
          clip.timestamp === clipToDelete.timestamp && 
          clip.text === clipToDelete.text
        );
        
        if (originalIndex !== -1) {
          clips.splice(originalIndex, 1);
          await chrome.storage.sync.set({ clips });
          await this.loadClips(); // Reload the display
          this.showToast('Clip deleted');
        }
      }
    } catch (error) {
      console.error('Error deleting clip:', error);
      this.showToast('Failed to delete clip', 'error');
    }
  }

  async clearAllClips() {
    if (confirm('Are you sure you want to delete all clips? This cannot be undone.')) {
      try {
        await chrome.storage.sync.set({ clips: [] });
        await this.loadClips();
        this.showToast('All clips deleted');
      } catch (error) {
        console.error('Error clearing clips:', error);
        this.showToast('Failed to clear clips', 'error');
      }
    }
  }

  async exportClips() {
    try {
      const result = await chrome.storage.sync.get('clips');
      const clips: ClipData[] = result.clips || [];
      
      if (clips.length === 0) {
        this.showToast('No clips to export');
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
      this.showToast('Export downloaded');
    } catch (error) {
      console.error('Error exporting clips:', error);
      this.showToast('Failed to export clips', 'error');
    }
  }

  showEmptyState() {
    this.clipsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No clips saved yet</h3>
        <p>Right-click on selected text and choose "Lưu đoạn Text này" to start saving clips!</p>
      </div>
    `;
  }

  showError(message: string) {
    this.clipsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
  }

  showToast(message: string, type: 'success' | 'error' = 'success') {
    // Create toast notification
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

    // Add animation keyframes
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

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});