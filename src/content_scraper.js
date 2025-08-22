/**
 * This content script runs inside the iframe loaded by the offscreen document.
 * It scrapes the message count and sends it to the background script.
 */

function extractUnreadMessages() {
  let totalCount = 0;

  // For notifications count. If the element doesn't exist, querySelector returns null,
  // and the count remains 0, preventing errors.
  const notificationsBadge = document.querySelector('span[data-testid=":badge-display-number"]');
  if (notificationsBadge && notificationsBadge.textContent) {
    totalCount += parseInt(notificationsBadge.textContent.trim(), 10) || 0;
  }

  // For messages count. Same as above, handles absence gracefully.
  const messagesBadge = document.querySelector('span[data-testid=":reloaded-messaging-badge-count"]');
  if (messagesBadge && messagesBadge.textContent) {
    totalCount += parseInt(messagesBadge.textContent.trim(), 10) || 0;
  }

  return totalCount;
}

function sendCount() {
  const count = extractUnreadMessages();
  chrome.runtime.sendMessage({ action: 'unread_message_count', count: count });
}

// The DOM might not be ready immediately. We use a MutationObserver to wait for the button to appear.
const observer = new MutationObserver((mutations, obs) => {
  const messageButton = document.querySelector('button[data-testid=":reloaded-messaging-button"]');
  if (messageButton) {
    setTimeout(sendCount,5000); // Wait for angular to render the final count.
    obs.disconnect(); // Stop observing once the button is found
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});