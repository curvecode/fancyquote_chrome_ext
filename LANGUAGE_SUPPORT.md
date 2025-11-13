# Language Support Implementation

## Overview
The Chrome extension now supports multiple languages with dynamic switching for both the popup interface and context menus.

## Supported Languages
- 🇺🇸 English (en)
- 🇻🇳 Vietnamese (vi) 
- 🇨🇿 Czech (cs)

## How It Works

### 1. Language Files Structure
```
_locales/
├── en/messages.json    (English)
├── vi/messages.json    (Vietnamese)
└── cs/messages.json    (Czech)
```

### 2. Components

#### Popup Language Switching
- **Language Selector**: Dropdown in popup header
- **Dynamic Updates**: All UI text updates immediately
- **Storage**: Language preference saved to `chrome.storage.sync`

#### Context Menu Language Support
- **Auto-Update**: Context menu recreated when language changes
- **Storage Listener**: Background script monitors language changes
- **Fallback**: Uses Chrome's built-in i18n as fallback

#### Notification Language Support
- **Dynamic Messages**: Notifications use current language
- **Background Integration**: Shares language state with popup

### 3. Language Manager Classes

#### Popup LanguageManager
- Loads and caches translations
- Handles language switching
- Manages substitutions (placeholders)

#### Background LanguageManager  
- Monitors storage changes
- Updates context menu dynamically
- Manages notification languages

### 4. Features

#### Automatic Detection
- Detects browser language on first install
- Falls back to English if language not supported

#### Dynamic Switching
- No extension reload required
- Context menu updates immediately
- All UI text updates in real-time

#### Error Handling
- Graceful fallback to English
- Chrome i18n as secondary fallback
- Error logging for debugging

### 5. Usage

#### For Users
1. Click extension icon to open popup
2. Select language from dropdown in header
3. All text (popup + context menu) updates instantly
4. Language preference persists across browser sessions

#### For Developers
1. Add new languages by creating `_locales/{lang}/messages.json`
2. Update language arrays in both LanguageManager classes
3. Add language option to HTML dropdown

### 6. Message Keys Used
- `extensionName` - Extension title
- `contextMenuTitle` - Right-click menu text
- `popupTitle` - Popup header
- `refreshButton`, `clearAllButton`, `exportButton` - Action buttons
- `notificationSuccess`, `notificationNoText`, `notificationError` - System notifications
- `emptyStateTitle`, `emptyStateDescription` - Empty state messages
- `toastCopied`, `toastDeleted`, etc. - User feedback messages
- `timeAgoNow`, `timeAgoMinutes`, `timeAgoHours`, `timeAgoDays` - Time formatting
- `confirmClearAll` - Confirmation dialogs

### 7. Technical Implementation

#### Communication Flow
```
Popup Language Change → Storage Update → Background Script Listener → Context Menu Update
```

#### Storage Schema
```javascript
{
  selectedLanguage: 'en' | 'vi' | 'cs'
}
```

#### Fallback Chain
1. Custom loaded translations
2. Chrome i18n getMessage()  
3. Original message key

This implementation provides a seamless multilingual experience with real-time language switching across all extension components.