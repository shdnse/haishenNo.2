# 红黑展廊 / Immersive projects

## 实现

- 职业区保留两张原图与四个独立 SVG 人物蒙版；画面全宽，标题紧凑，职业按钮叠在画面下缘。1440px 桌面视口中画面高度占模块约 90%；窄屏仍可横向探索原图。
- 项目区左右共用 `crimson-hall.png` 静态背景，上下渐变衔接。桌面左侧为固定在阅读区的章节介绍，右侧是四项作品的交错时间轴；没有编造项目日期。手机端使用上下布局与缩进式时间轴。
- 按用户最后的要求，已撤销未发布的 3D 建模方案：删除三维人物、相机、WebGL 渲染代码、模型和 Three.js 依赖。这里没有新增 JavaScript 运行时，也不再请求三维资源。
- 四个原有项目、全部介绍和试玩链接不变。职业区仍保留四人物各自独立的剪影唤醒、点击保留/取消、键盘和触控交互。
- `node scripts/validate-immersive.mjs` 验证四项作品所有内容与链接、首页/教育/联系原文未改动，以及三维入口/文件已移除。原有证书数据校验仍可运行。

## 背景图生成记录

使用内置 **image_gen** 完成背景扩图，没有使用外部 API/CLI 降级生成。保留生成器原始 PNG：`crimson-hall.png`（1678 × 937）。

参考图为现有站点 `assets/archive/wallpaper/background.webp` 与 `subject.webp`。第二张只用于风格参考，人物没有烘焙进新背景。背景生成时预留的左侧空间，在取消三维方案后用于章节介绍。

最终提示词：

> Use case: compositing / background expansion. Asset type: a single static immersive website environment, wide landscape 16:9, high resolution. Image 1 is the existing website's flat crimson background to expand and enrich. Image 2 is STYLE AND MOOD REFERENCE ONLY (the dark gothic portrait); do not include or duplicate its person. Expand the crimson setting into a spacious, atmospheric deep-black and blood-red gothic void, with faint enormous architectural arches receding into darkness, very subtle thorn silhouettes along the far left and far edges, low drifting crimson mist and delicate aged stone grain. Keep the same red-black palette as the references, no blue, no purple. The website will place a real 3D bust on the LEFT HALF and readable project timeline text on the RIGHT HALF: leave both regions uncluttered, particularly the right half with very dark even contrast; a soft dim red aura on the left is welcome. Top and bottom fade naturally into almost-black #110e10 so this background connects seamlessly to adjacent website sections. Cinematic, restrained, high quality, generous negative space. No person, no statue, no face, no letters, no text, no logo, no UI, no border. Preserve the mood of the supplied original, do not generate a separate scene or bright illustration.
