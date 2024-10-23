function sendLog(message) {
  chrome.runtime.sendMessage({type: 'log', message});
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({type: 'captureTab'}, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.dataUrl);
      }
    });
  });
}

async function captureFullPage() {
  const fullHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const originalScrollPos = window.scrollY;
  const pageTitle = document.title.replace(/[<>:"/\\|?*]/g, '_');
  
  sendLog(`页面总高度: ${fullHeight}px, 视口高度: ${viewportHeight}px`);

  const captures = [];
  let partIndex = 1;

  for (let currentPos = 0; currentPos < fullHeight; currentPos += viewportHeight) {
    window.scrollTo(0, currentPos);
    sendLog(`滚动到位置: ${currentPos}px`);
    await delay(500);
    
    try {
      const dataUrl = await captureVisibleTab();
      sendLog('视口捕获完成');
      captures.push({ dataUrl, y: currentPos });
      
      // 保存每个部分
      chrome.runtime.sendMessage({
        type: 'saveScreenshot',
        dataUrl: dataUrl,
        filename: `${pageTitle}/${pageTitle}-${partIndex}.png`
      });
      
      partIndex++;
    } catch (error) {
      sendLog(`捕获失败: ${error.message}`);
      await delay(1000);
      currentPos -= viewportHeight;
    }

    await delay(1000);
  }
  
  sendLog(`共捕获 ${captures.length} 个部分`);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // 计算总高度
  const totalHeight = captures.reduce((sum, capture) => sum + viewportHeight, 0);
  canvas.width = viewportWidth;
  canvas.height = totalHeight;

  let yOffset = 0;
  captures.forEach(capture => {
    const img = new Image();
    img.onload = () => {
      context.drawImage(img, 0, yOffset, viewportWidth, viewportHeight);
      yOffset += viewportHeight;
    };
    img.src = capture.dataUrl;
  });

  // 等待所有图片加载并绘制完成
  await new Promise(resolve => setTimeout(resolve, 1000 * captures.length));

  // 生成最终图像并发送
  const finalDataURL = canvas.toDataURL('image/png');
  sendLog('生成最终图像...');
  chrome.runtime.sendMessage({type: 'saveFinalImage', dataUrl: finalDataURL});

  window.scrollTo(0, originalScrollPos);
  sendLog('已恢复原始滚动位置');
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    sendLog('收到捕获请求');
    captureFullPage().then(dataUrl => {
      sendLog('捕获完成,发送结果');
      sendResponse({dataUrl});
    }).catch(error => {
      sendLog(`捕获过程中出错: ${error.message}`);
      sendResponse({error: error.message});
    });
    return true; // 表示我们会异步发送响应
  }
  if (request.action === "captureVisibleTab") {
    const pageTitle = document.title.replace(/[<>:"/\\|?*]/g, '_'); // 清理标题中的非法字符
    chrome.runtime.sendMessage({
      action: "processCapture",
      pageTitle: pageTitle
    });
  }
});
