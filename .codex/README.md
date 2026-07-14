# .codex · 项目内 Codex 配置

本目录存放 Codex 在本仓库工作时要读取的项目规则与 skills。它不属于线上静态站点内容，部署脚本会排除 `.codex/**`。

## 目录

| 路径 | 用途 |
|------|------|
| `rules/project-rules.md` | 仓库级 Codex 工作规则 |
| `skills/sfk-reveal-deck-workflow/SKILL.md` | SFK Reveal 多站点工作流 |
| `skills/deck-progress-bar/SKILL.md` | 底部 S 进度条专项 |
| `skills/portrait-deck-adapt/SKILL.md` | 竖屏轻量适配专项 |

## 维护原则

- `AGENTS.md` 是所有 Agent 的入口；本目录只放 Codex 侧的细化规则。
- 当 `.cursorrules` 或 `.cursor/skills` 更新了仍适用于 Codex 的规范，及时同步到这里。
- 不要把密钥、部署 `.env`、运行缓存或大素材放进 `.codex/`。
- 新增 skill 时保持 `SKILL.md` 有 `name` 与 `description` frontmatter，并把触发场景写进 description。
