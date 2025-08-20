/**
 * This content script runs inside the iframe loaded by the offscreen document.
 * It scrapes the message count and sends it to the background script.
 */

function extractUnreadMessages() {
  const messageButton = document.querySelector('button[data-testid=":reloaded-messaging-button"]');
  if (messageButton) {
    const ariaLabel = messageButton.getAttribute('aria-label');
    if (ariaLabel && !ariaLabel.includes('0 unread messages')) {
      const match = ariaLabel.match(/(\d+) unread messages/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return 1; // Fallback if number parsing fails but unread messages exist
    }
  }
  return 0; // No unread messages
}

function sendCount() {
  const count = extractUnreadMessages();
  chrome.runtime.sendMessage({ action: 'unread_message_count', count: count });
}

// The DOM might not be ready immediately. We use a MutationObserver to wait for the button to appear.
const observer = new MutationObserver((mutations, obs) => {
  const messageButton = document.querySelector('button[data-testid=":reloaded-messaging-button"]');
  if (messageButton) {
    sendCount();
    // Use a short interval to periodically re-check, as the button's label can change without a full page reload.
    setInterval(sendCount, 60000); // Check every 60 seconds
    obs.disconnect(); // Stop observing once the button is found
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Also run once on load, in case the element is already there.
sendCount();
