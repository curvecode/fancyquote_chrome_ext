function getSelectedText(): string {
  const selection = window.getSelection();
  return selection ? selection.toString().trim() : '';
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "ping") {
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
    return true;
  }
  
  return false;
});