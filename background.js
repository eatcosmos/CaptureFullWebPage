chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'captureTab') {
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, dataUrl => {
      sendResponse({dataUrl});
    });
    return true;
  }
  
  if (request.type === 'saveScreenshot') {
    const {dataUrl, filename} = request;
    
    // 保存文件
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    // 复制到剪贴板
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const item = new ClipboardItem({'image/png': blob});
        navigator.clipboard.write([item]);
      });
  }
});
