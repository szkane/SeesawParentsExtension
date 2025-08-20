// 当iframe加载完成后，通知background.js侧边栏已加载
document.addEventListener('DOMContentLoaded', function() {
  const iframe = document.getElementById('seesaw-frame');
  
  iframe.addEventListener('load', function() {
    console.log('Sidepanel Iframe loaded.');
    chrome.runtime.sendMessage({action: 'sidepanel_loaded'});
  });
});
