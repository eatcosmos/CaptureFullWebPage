const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 创建 icons 目录
const iconDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir);
}

// 创建一个简单的图标 - 白色背景上的黑色截图图标
const svgIcon = `
<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="white"/>
  <rect x="24" y="24" width="80" height="60" fill="none" stroke="black" stroke-width="8"/>
  <path d="M24 44 L104 44" stroke="black" stroke-width="8"/>
  <circle cx="64" cy="64" r="12" fill="black"/>
  <rect x="34" y="84" width="60" height="20" fill="black"/>
</svg>
`;

// 需要生成的尺寸
const sizes = [16, 48, 128];

// 为每个尺寸生成 PNG 图标
sizes.forEach(size => {
  sharp(Buffer.from(svgIcon))
    .resize(size, size)
    .png()
    .toFile(path.join(iconDir, `icon${size}.png`))
    .then(() => console.log(`生成了 ${size}x${size} 图标`))
    .catch(err => console.error(`生成 ${size}x${size} 图标时出错:`, err));
});
