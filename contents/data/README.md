# contents/data — 策划用 JSON 源文件

**在此目录编辑**，不要直接改根目录 `data/`（后者由 deploy 自动同步）。

| 文件 | 同步目标 | 用途 |
|------|----------|------|
| `salary.json` | `data/salary.json` | 主 deck 薪资 ECharts 数据源 |

`deploy/sync.ps1` 在每次上传前执行 `contents/data/*.json` → `data/` 复制。

运行时脚本 fallback：`scripts/employment/salary-echarts.js` 会依次尝试 `data/salary.json` 与 `contents/data/salary.json`（本地开发）。
