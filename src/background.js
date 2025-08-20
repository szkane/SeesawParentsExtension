// 初始化变量
let unreadMessageCount = 0;

// 初始化函数
function init() {
  // 初始化webRequest监听器
  initWebRequestListener();
  
  // 设置定时检查新消息
  chrome.alarms.create('checkMessages', { periodInMinutes: 5 });
}

// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 打开侧边栏
  await chrome.sidePanel.open({ tabId: tab.id });
  
  // 重置未读消息数量
  resetBadge();
});

// 设置定时检查新消息
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkMessages') {
    checkForNewMessages();
  }
});

// 监听来自sidepanel.js的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidepanel_loaded') {
    console.log('Side panel loaded');
    console.log('Background script received message:', message);
    // 侧边栏已加载，可以重置未读消息
    resetBadge();
    // 检查消息
    checkForNewMessages;
    sendResponse({status: "ok"}); 
  } else if (message.action === 'check_messages') {
    checkForNewMessages();
    sendResponse({status: "checking"}); 
  } else if (message.action === 'unread_message_count') {
    // 接收从侧边栏传来的未读消息数量
    handleMessageCount(message.count);
    sendResponse({status: "updated"}); 
  } else if (message.action === 'inject_script_to_iframe') {
    // 处理注入脚本到iframe的请求
    sendResponse({status: "no_action_needed"}); 
  }else{
    sendResponse({status: "unknown_action", action: message.action});
  }
});

// 初始化webRequest监听器
function initWebRequestListener() {
  // 监听对Seesaw消息页面的请求
  chrome.webRequest.onCompleted.addListener(
    function(details) {
      // 当页面加载完成时，检查消息
      if (details.type === 'main_frame' || details.type === 'xmlhttprequest') {
        // 延迟一下，确保页面完全加载
        setTimeout(checkForNewMessages, 1000);
      }
    },
    { urls: ["https://app.seesaw.me/*"] }
  );
}

// 检查新消息的函数
function checkForNewMessages() {
  // 获取当前所有标签页
  chrome.tabs.query({url: "https://app.seesaw.me/*"}, function(tabs) {
    if (tabs.length > 0) {
      // 如果有Seesaw标签页打开，在该页面执行脚本
      chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        function: extractUnreadMessages
      }, (results) => {
        if (results && results[0] && results[0].result !== undefined) {
          handleMessageCount(results[0].result);
        }
      });
    } else {
      // 如果没有Seesaw标签页，尝试通过侧边栏检查
      chrome.runtime.sendMessage({action: 'inject_script_to_iframe'})
      .catch((error) => {
        console.log("Attempted to send message to a closed side panel. This is expected.");
      });
    }
  });
}

// 在页面上下文中执行的函数，提取未读消息数量
function extractUnreadMessages() {
  // 查找消息按钮
  const messageButton = document.querySelector('button[data-testid=":reloaded-messaging-button"]');
  
  if (messageButton) {
    const ariaLabel = messageButton.getAttribute('aria-label');
    
    // 检查aria-label属性
    if (ariaLabel && ariaLabel !== 'Messages, 0 unread messages') {
      // 提取未读消息数量
      const match = ariaLabel.match(/(\d+) unread messages/);
      if (match && match[1]) {
        return parseInt(match[1], 10);
      }
      return 1; // 如果有未读消息但无法确定数量，则返回1
    }
  }
  
  return 0; // 没有未读消息
}

// 处理从侧边栏接收到的消息数量
function handleMessageCount(count) {
  // 只有当消息数量变化时才更新
  if (count !== unreadMessageCount) {
    unreadMessageCount = count;
    updateBadge();
    
    // 存储未读消息数量
    chrome.storage.local.set({ 'unreadMessages': unreadMessageCount });
  }
}

// 更新扩展图标上的徽章
function updateBadge() {
  if (unreadMessageCount > 0) {
    // 设置徽章文本
    chrome.action.setBadgeText({ text: unreadMessageCount.toString() });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
    // 设置徽章背景颜色
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    // 清除徽章
    chrome.action.setBadgeText({ text: '' });
  }
}

// 重置徽章
function resetBadge() {
  unreadMessageCount = 0;
  updateBadge();
  chrome.storage.local.set({ 'unreadMessages': 0 });
}

// 初始化时从存储中恢复未读消息计数
chrome.storage.local.get(['unreadMessages'], (result) => {
  if (result.unreadMessages) {
    unreadMessageCount = result.unreadMessages;
    updateBadge();
  }
});

// 确保在扩展加载完成后初始化
chrome.runtime.onInstalled.addListener(() => {
  init();
});