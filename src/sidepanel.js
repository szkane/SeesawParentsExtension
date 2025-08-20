// 监听iframe中的消息变化
document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('seesaw-frame');
  
  // 当iframe加载完成后，尝试监听消息变化
  iframe.addEventListener('load', function() {
    // 通知background.js侧边栏已加载
    chrome.runtime.sendMessage({action: 'sidepanel_loaded'});
    
    // 定期检查是否有新消息
    setInterval(checkForNewMessages, 30000); // 每30秒检查一次
  });
  
  // 监听来自background.js的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'check_messages_in_iframe') {
      // 收到检查消息的请求，执行检查
      checkMessagesInIframe();
    }
    return true;
  });
});

// 检查新消息的函数
function checkForNewMessages() {
  // 由于跨域限制，我们不能直接访问iframe内容
  // 这里发送消息给background.js，让它通过API或其他方式检查
  chrome.runtime.sendMessage({action: 'check_messages'});
}

// 在iframe中检查未读消息
function checkMessagesInIframe() {
  try {
    const iframe = document.getElementById('seesaw-frame');
    
    // 尝试访问iframe内容
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // 查找消息按钮
    const messageButton = iframeDoc.querySelector('button[data-testid=":reloaded-messaging-button"]');
    
    let unreadCount = 0;
    
    if (messageButton) {
      const ariaLabel = messageButton.getAttribute('aria-label');
      
      // 检查aria-label属性
      if (ariaLabel && ariaLabel !== 'Messages, 0 unread messages') {
        // 提取未读消息数量
        const match = ariaLabel.match(/(\d+) unread messages/);
        if (match && match[1]) {
          unreadCount = parseInt(match[1], 10);
        } else {
          unreadCount = 1; // 如果有未读消息但无法确定数量，则返回1
        }
      }
    }
    
    // 将未读消息数量发送给background.js
    chrome.runtime.sendMessage({
      action: 'unread_message_count',
      count: unreadCount
    });
  } catch (error) {
    console.error('检查iframe中的消息时出错:', error);
    // 出错时发送0作为默认值
    chrome.runtime.sendMessage({
      action: 'unread_message_count',
      count: 0
    });
  }
}