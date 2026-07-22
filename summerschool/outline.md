# Outline · USC × 游研社 · 夏校课程说明会



> **结构源**：15 页独立 deck。生成或修改 `index.html` 前必须先读本文。



---



## Deck 元信息



| 字段 | 值 |

|------|-----|

| `deck_title` | USC × 游研社 · 夏校课程说明会 |

| `brand` | USC × 游研社 |

| `status` | draft（框架阶段，仅标题） |

| `linear` | yes（仅横向翻页） |

| `pages` | 16 |



---



## 页映射（`#/id`）



| 页码 | 章节 | `id` | 内容来源 | 备注 |

|------|------|------|----------|------|

| 01 | 封面 | `title` | PDF p1 | mesh 背景 |

| 02 | 教学团队 | `team` | PDF p4–6 + 现场解说 | 稀疏页，Gestalt 留白 |

| 03 | 日程安排 | `schedule` | PDF p7–8 + Excel + Syllabus | 线上 Module 1 卡片表 |

| 04 | 日程安排 | `schedule-offline` | Excel + 最新 Syllabus · Module 2 | 8 节教授课三语摘要 + 英文原版 / Module 2 中文译本下载 |

| 05 | 核心体验 | `experience` | PDF p9–13 | 稀疏页 |

| 06 | 场地介绍 | `venue` | 本地场地照片 + 外链 | 双栏：游研社 / S 空间 |

| 07 | 课程支持 | `support` | PDF p14–16 + 扩展 | **Tab 页**（2 面板） |

| 08 | 课前作业 | `homework` | PDF p17–18 | 稀疏页 |

| 09 | 小贴士 | `tips` | PDF p19–21 | 稀疏页 |

| 10 | 资源链接 | `resource-links` | 会议码 + 回放 + 三栏外链 | 三栏 · 书/笔/记事本图标 |

| 11 | 夏校主视觉 | `main-visual` | GMC 2026 夏校视觉方案 | 赛博像素 / 复古未来主义 |

| 12 | 破冰活动 | `ice-break` | `summerschool/modules/ice-break/` | 3000×1200 原比例任务图；D 显示骰子，空格投掷 |
| 13 | 结课周事务安排 | `final-itinerary` | 用户提供的 7/21–7/25 日程 | 表格：日期 × 上午/下午/晚上，Syllabus 外链 |
| 14 | 游戏项目信息上传 | `game-upload` | 6 个小组按钮，点击跳转飞书表单 | 3×2 渐变色卡片网格 |
| 15 | 夏校树洞 | `message-board` | 飞书表单匿名提交，仅老师后台可见 | 左侧提交按钮 + 右侧树洞夜景装饰插画 |
| 16 | Playtest 海报 | `playtest` | `assets/playtest.png` 全屏展示 | 黑色背景，右上角全屏按钮，无额外文字 |



---



## 内容类型说明



| 类型 | 说明 | 网页策略 |

|------|------|----------|

| 1 | 说明会 PDF 已有 | 直接写入 slide |

| 2 | 现场解说 / 投屏 | **不在网页展示** |

| 3 | Syllabus + 课表 + 网络资料 | 补充到对应章节 |



---



## 课程支持 Tab 规划



| Tab | 面板 id | 来源 |

|-----|---------|------|

| 课程资料 | `materials` | PDF p15 — 微信群公告、合作平台、云盘、课程笔记 |

| 自备物料 | `gear` | PDF p16 — 硬件清单与推荐软件 |

