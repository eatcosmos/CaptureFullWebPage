function appendLog(message) {
  const logElement = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = message;
  logElement.appendChild(p);
  logElement.scrollTop = logElement.scrollHeight;
}

document.getElementById('capture').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  
  document.getElementById('preview').innerHTML = '';
  
  appendLog('开始注入 content script...');
  try {
    await chrome.scripting.executeScript({
      target: {tabId: tab.id},
      files: ['content.js']
    });
    appendLog('content script 注入完成');
  } catch (error) {
    appendLog(`注入 content script 失败: ${error.message}`);
    return;
  }
  
  appendLog('发送截图请求...');
  chrome.tabs.sendMessage(tab.id, {action: 'capture'}, response => {
    if (chrome.runtime.lastError) {
      appendLog(`错误: ${chrome.runtime.lastError.message}`);
      return;
    }
    if (response.error) {
      appendLog(`截图失败: ${response.error}`);
    } else if (response.dataUrl) {
      appendLog('截图完成,准备保存...');
      const filename = `${tab.title}.png`;
      chrome.runtime.sendMessage({
        type: 'saveScreenshot',
        dataUrl: response.dataUrl,
        filename
      });
      appendLog('截图已保存并复制到剪贴板');
      
      const img = document.createElement('img');
      img.src = response.dataUrl;
      img.style.imageRendering = 'pixelated';  // 保持像素清晰
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      document.getElementById('preview').appendChild(img);
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'log') {
    appendLog(request.message);
  } else if (request.type === 'previewPart') {
    const img = document.createElement('img');
    img.src = request.dataUrl;
    img.style.maxWidth = '100%';
    img.style.height = 'auto';
    img.style.marginBottom = '10px';
    document.getElementById('preview').appendChild(img);
  }
});
