// 全局变量
let unreadMessageCount = 0;
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';

// 用于防止重复创建的“锁”
let creatingOffscreenDocument;

// 创建离屏文档的函数（已修复竞态条件）
async function createOffscreenDocument() {
  // 如果已存在，则直接返回
  if (await chrome.offscreen.hasDocument()) {
    console.log("Offscreen document already exists.");
    return;
  }

  // 如果正在创建中，则等待创建完成
  if (creatingOffscreenDocument) {
    console.log("Waiting for existing offscreen document creation to complete.");
    await creatingOffscreenDocument;
    return;
  }

  // 设置“锁”，开始创建
  console.log("Creating offscreen document...");
  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ['DOM_PARSER'],
    justification: 'To check for unread Seesaw messages in the background'
  });

  try {
    // 等待创建完成
    await creatingOffscreenDocument;
  } finally {
    // 无论成功与否，都释放“锁”
    creatingOffscreenDocument = null;
  }
}

// 关闭离屏文档的函数
async function closeOffscreenDocument() {
  if (!(await chrome.offscreen.hasDocument())) {
    console.log("No offscreen document to close.");
    return;
  }
  console.log("Closing offscreen document...");
  await chrome.offscreen.closeDocument();
}

// 扩展安装或更新时运行
chrome.runtime.onInstalled.addListener(async () => {
  console.log("Extension installed or updated.");
  // 创建一个周期性闹钟，每5分钟检查一次消息
  chrome.alarms.create('checkMessages', { periodInMinutes: 5 });
  // 立即执行一次检查
  await createOffscreenDocument();
});

// 监听闹钟事件
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'checkMessages') {
    console.log("Alarm triggered: closing and recreating offscreen document.");
    await closeOffscreenDocument();
    await createOffscreenDocument();
  }
});

// 监听扩展图标点击事件，打开侧边栏
chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

// 监听来自其他脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sidepanel_loaded') {
    console.log('Side panel has been loaded.');
    resetBadge();
    sendResponse({status: "badge_reset"});
  } else if (message.action === 'unread_message_count') {
    console.log(`Received message count: ${message.count}`);
    handleMessageCount(message.count);
    sendResponse({status: "count_updated"});
  }
  return true; // 保持通道开放以备将来使用
});

// 处理获取到的消息数量
function handleMessageCount(count) {
  if (count !== unreadMessageCount) {
    console.log(`Updating count from ${unreadMessageCount} to ${count}`);
    unreadMessageCount = count;
    updateBadge();
    chrome.storage.local.set({ 'unreadMessages': unreadMessageCount });
  }
}

// 更新扩展图标上的徽章
function updateBadge() {
  if (unreadMessageCount > 0) {
    chrome.action.setBadgeText({ text: unreadMessageCount.toString() });
    chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
    chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }
}

// 重置徽章和计数的函数
function resetBadge() {
  unreadMessageCount = 0;
  updateBadge();
  chrome.storage.local.set({ 'unreadMessages': 0 });
}

// 初始化：扩展启动时，从存储中恢复上次的计数
(async () => {
  const result = await chrome.storage.local.get(['unreadMessages']);
  if (result.unreadMessages) {
    unreadMessageCount = result.unreadMessages;
    updateBadge();
  }
  // 启动时也创建一次离屏文档
  await createOffscreenDocument();
})();
