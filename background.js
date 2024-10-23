chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'captureTab') {
    chrome.tabs.captureVisibleTab(null, {
      format: 'png'
    }, dataUrl => {
      sendResponse({ dataUrl });
    });
    return true;
  }
  
  if (request.type === 'saveScreenshot') {
    const {dataUrl, filename} = request;
    
    chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false
    });
    
    // 复制最后一张到剪贴板
    if (filename.endsWith('-1.png')) {
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const item = new ClipboardItem({'image/png': blob});
          navigator.clipboard.write([item]);
        });
    }
  }
  
  if (request.action === "processCapture") {
    const folderName = request.pageTitle || 'screenshots';
    
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${folderName}/${timestamp}.png`;
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });
    });
  }
  
  // 在 chrome.runtime.onMessage.addListener 中添加以下代码
  if (request.type === 'saveFinalImage') {
    const pageTitle = request.pageTitle;
    const filename = `${pageTitle}.png`;
    chrome.downloads.download({
      url: request.dataUrl,
      filename: filename,
      saveAs: false
    });
    
    // 复制到剪贴板
    fetch(request.dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const item = new ClipboardItem({'image/png': blob});
        navigator.clipboard.write([item]);
      });
  }
});
