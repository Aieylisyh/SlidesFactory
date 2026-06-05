# 网页图片压缩规范 · Image Compression

> 本地素材进入 `assets/` 后、引用到 `index.html` 之前，**必须**按本规范压缩。  
> 工具：`scripts/compress_web_assets.py`（依赖 Pillow）· 抽图：`scripts/extract_pdf_images.py`

---

## 何时必须压缩（CRITICAL）

| 场景 | 动作 |
|------|------|
| 运行 `extract_pdf_images.py` 抽出新图 | 抽图完成后**立即**运行压缩脚本 |
| 新增 / 替换 `assets/` 下任意 JPEG/PNG/WebP | 单文件 **≥ 80 KB** 必须压到标准以内 |
| 从微信 / 相机导入的大图（如 `summerschool/`） | 最长边 often > 3000px，**必须先缩放** |
| 修改 `cover-title.png` | 压缩 PNG 并**重新生成** `cover-title.webp` |

**禁止**把未压缩的多 MB 原图直接提交或引用到 HTML。

---

## 体积与尺寸标准

| 类型 | 最长边 | 目标体积 | 格式参数 |
|------|--------|----------|----------|
| 幻灯片内 JPEG（截图、海报、3D 渲染） | ≤ **1920 px** | 单张 **≤ 350 KB**（聊天截图可 ≤ 150 KB） | quality **82**，progressive，optimize |
| 封面 `cover-title.png`（无透明） | 保持 **896×1120** | PNG **≤ 200 KB** | 256 色调色板 PNG；WebP fallback q**85** |
| 封面 `cover-title.webp` | 同 PNG | **≤ 120 KB** | quality **85**，method 6 |
| Logo / 小图标 PNG | 不放大；仅 optimize | **≤ 80 KB** | `compress_level=9`，不量化 |
| Favicon / apple-touch-icon | 原尺寸 | 尽量 **< 10 KB** | 手动导出即可 |

### 阈值说明

- **80 KB**：超过此大小且被网页引用的文件，脚本默认处理；AI 新增素材时人工也应检查。
- **1920 px**：Reveal 全屏宽度下足够清晰；更大尺寸只会拖慢首屏与翻页。
- 抽图产物若 **< 80 KB** 且尺寸已 ≤ 1920，可跳过（脚本自动忽略）。

---

## 不处理的文件

以下路径/前缀**不在**网页引用中，脚本默认跳过（勿当作生产素材）：

- `test-*`、`debug-*` — 开发调试残留
- `pdf-page-*-preview*` — PDF 预览截图
- `assets/summerschool/_extracted/` — 中间产物

---

## 压缩脚本用法

依赖：`pip install Pillow`（项目已用于 `extract_pdf_images.py`）。

```bash
# 压缩 assets/ 中 ≥80KB 的生产图片
python scripts/compress_web_assets.py

# 预览将处理的文件，不写盘
python scripts/compress_web_assets.py --dry-run

# 自定义阈值（KB）与最长边
python scripts/compress_web_assets.py --min-kb 50 --max-edge 1600
```

脚本行为摘要：

1. **JPEG/JPG**：转 RGB → 最长边缩至 `--max-edge`（默认 1920）→ quality 82 写回（仅当体积变小）。
2. **PNG**：`optimize` + `compress_level=9`；`cover-title.png` 无透明通道时用 256 色调色板。
3. **WebP**：quality 85；并在处理完 `cover-title.png` 后自动重生 `cover-title.webp`。

---

## 标准工作流

```text
contents/*.pdf
    │  python scripts/extract_pdf_images.py --pdf … --out assets/pdf-extracted
    ▼
assets/pdf-extracted/*.jpeg   （可能很大）
    │  python scripts/compress_web_assets.py
    ▼
assets/ 引用到 index.html    （?v= 按需递增）
```

手动添加图片（海报、微信图等）时：

1. 放入 `assets/<子目录>/`
2. 运行 `python scripts/compress_web_assets.py`
3. 本地预览：`start-lan-server.bat` → 检查清晰度与加载速度

---

## HTML 与格式选择

| 用途 | 推荐 |
|------|------|
| 封面主视觉 | `<picture>`：`cover-title.webp` + `cover-title.png` fallback（已有） |
| 幻灯片内容图 | JPEG；微信截图加 `.chat-shot` + `object-fit: contain` |
| 需透明 Logo | PNG，仅 optimize，不转 JPEG |
| 占位 | 无本地图时用 `.image-placeholder`，**禁止**假外链 |

---

## 质量检查清单

提交或交付前：

- [ ] `assets/` 内无单文件 **> 500 KB** 的生产引用图（除非用户明确要求保留原图）
- [ ] 新增图片均已跑过 `compress_web_assets.py`
- [ ] `cover-title.webp` 与 `cover-title.png` 成对更新
- [ ] 长边 **> 1920** 的照片已缩放
- [ ] 未把 `test-*` / `debug-*` 图引用进 HTML

---

## 相关文档

| 文件 | 关系 |
|------|------|
| `.cursorrules` §2 | AI 必须遵守的压缩强制项 |
| [`../contents/README.md`](../contents/README.md) | 抽图 → 压缩串联说明 |
| [`README.md`](README.md) | 说明文档索引 |
| [`OUTLINE_GUIDE.md`](OUTLINE_GUIDE.md) | `assets` 字段应注明是否需压缩 |
