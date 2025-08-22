/**
 * This content script runs inside the iframe loaded by the offscreen document.
 * It scrapes the message count and sends it to the background script.
 */

function extractUnreadMessages() {
  const title = document.title;
  const match = title.match(/^\((\d+)\)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

function sendCount() {
  const count = extractUnreadMessages();
  chrome.runtime.sendMessage({ action: 'unread_message_count', count: count });
}

// The DOM might not be ready immediately. We use a MutationObserver to wait for the button to appear.
const observer = new MutationObserver((mutations, obs) => {
  const messageButton = document.querySelector('button[data-testid=":reloaded-messaging-button"]');
  if (messageButton) {
    setTimeout(sendCount,5000); // Check immediately
    obs.disconnect(); // Stop observing once the button is found
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
