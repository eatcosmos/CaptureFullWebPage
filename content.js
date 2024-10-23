function sendLog(message) {
  chrome.runtime.sendMessage({ type: 'log', message });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function captureVisibleTab() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'captureTab' }, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response.dataUrl);
      }
    });
  });
}

async function captureFullPage() {
  // 保存原始滚动条样式
  const originalStyle = document.documentElement.style.overflow;
  // 隐藏滚动条
  document.documentElement.style.overflow = 'hidden';

  const devicePixelRatio = window.devicePixelRatio || 1;
  const fullHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const originalScrollPos = window.scrollY;
  const pageTitle = document.title.replace(/[<>:"/\\|?*]/g, '_');

  sendLog(`页面总高度: ${fullHeight}px, 视口高度: ${viewportHeight}px, DPR: ${devicePixelRatio}`);

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
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // 计算总高度和宽度
  const totalHeight = fullHeight * devicePixelRatio;
  canvas.width = viewportWidth * devicePixelRatio;
  canvas.height = totalHeight;

  ctx.scale(devicePixelRatio, devicePixelRatio);

  // 加载并绘制所有截图
  const loadPromises = captures.map(capture => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, capture.y, viewportWidth, viewportHeight);
        resolve();
      };
      img.src = capture.dataUrl;
    });
  });

  await Promise.all(loadPromises);

  // 生成最终图像
  const finalDataURL = canvas.toDataURL('image/png');
  sendLog('生成最终图像...');
  chrome.runtime.sendMessage({ type: 'saveFinalImage', dataUrl: finalDataURL });

  window.scrollTo(0, originalScrollPos);
  // 恢复滚动条
  document.documentElement.style.overflow = originalStyle;
  sendLog('已恢复原始滚动位置');
}

// 监听消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    sendLog('收到捕获请求');
    captureFullPage().then(() => {
      sendLog('捕获完成');
      sendResponse({});
    }).catch(error => {
      sendLog(`捕获过程中出错: ${error.message}`);
      sendResponse({ error: error.message });
    });
    return true;
  }
  if (request.action === "captureVisibleTab") {
    const pageTitle = document.title.replace(/[<>:"/\\|?*]/g, '_');
    chrome.runtime.sendMessage({
      action: "processCapture",
      pageTitle: pageTitle
    });
  }
});
