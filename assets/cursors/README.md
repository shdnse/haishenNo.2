# 职业光标原图

来源：用户指定的公开图片分享 https://chatgpt.com/s/m_6aa68792f3dc8191912cd5c680b58a32

四张图片均为直接导出的 1254 × 1254 透明 RGBA PNG，未重新绘制或压缩：

- `knight-original.png`：骑士 / 长剑
- `prince-original.png`：王子 / 权杖
- `witch-original.png`：女巫 / 法杖
- `archer-original.png`：弓手 / 箭矢

页面用 CSS 将原图转向左上并以 68 CSS 像素显示。只有当前选择的图片解码成功后才隐藏系统光标，失败则保留系统光标。移动端、编辑区域和证书原图弹窗使用系统指针。

桌面条件统一为宽度至少 901px、支持悬停且主要指针精确；其他设备保留连续滚动与原来的职业交互。无需新运行时依赖或 3D 模型。

回归检查：`node scripts/validate-journey.mjs`、`node scripts/validate-archive.mjs 534627a`、`node scripts/validate-immersive.mjs`。
