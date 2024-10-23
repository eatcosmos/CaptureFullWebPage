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
  
  sendLog(`页面总高度: ${fullHeight}px, 视口高度: ${viewportHeight}px`);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewportWidth;
  canvas.height = fullHeight;
  
  const captures = [];

  for (let currentPos = 0; currentPos < fullHeight; currentPos += viewportHeight) {
    window.scrollTo(0, currentPos);
    sendLog(`滚动到位置: ${currentPos}px`);
    await delay(500); // 等待滚动和页面重绘
    
    sendLog('开始捕获当前视口...');
    try {
      const dataUrl = await captureVisibleTab();
      sendLog('视口捕获完成');
      captures.push({ dataUrl, y: currentPos });
      chrome.runtime.sendMessage({type: 'previewPart', dataUrl});
    } catch (error) {
      sendLog(`捕获失败: ${error.message}`);
      await delay(1000); // 如果失败,等待更长时间再重试
      currentPos -= viewportHeight; // 重试当前位置
    }

    await delay(1000); // 限制截图频率
  }
  
  sendLog(`共捕获 ${captures.length} 个部分`);

  for (let i = 0; i < captures.length; i++) {
    const capture = captures[i];
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = capture.dataUrl;
    });

    if (i === captures.length - 1) {
      // 处理最后一张图片
      const remainingHeight = fullHeight - capture.y;
      context.drawImage(img, 0, 0, img.width, remainingHeight, 0, capture.y, img.width, remainingHeight);
    } else {
      context.drawImage(img, 0, 0, img.width, viewportHeight, 0, capture.y, img.width, viewportHeight);
    }
    sendLog(`已将捕获部分 ${i+1} 绘制到 y=${capture.y}px`);
  }
  
  window.scrollTo(0, originalScrollPos);
  sendLog('已恢复原始滚动位置');
  
  sendLog('生成最终图像...');
  return canvas.toDataURL('image/png');
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
});
