# Skills Manager — Design Spec

> 2026-06-12 | Status: approved

## Overview

一个跨平台（Windows + macOS）的 Electron 桌面应用，用于可视化管理 opencode skills。支持按技能组（group）组织 skills、通过 symlink 快速安装到项目、Git 云端同步，并提供 CLI 快捷入口。

## Architecture

```
skills (CLI) ──HTTP──► IPC Server (Electron Main :random-port)
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
        SkillManager   GitService    Renderer (GUI)
        (symlink/       (system git)  (React, Dark Premium)
         copy/scan)
```

**三大运行时进程：**

| 进程 | 职责 |
|------|------|
| **CLI** (`skills`) | 读取 `.ipc-port`，向 GUI 发 HTTP 请求传递当前工作路径；若 GUI 未运行则启动 Electron |
| **Electron Main** | IPC HTTP Server（localhost 随机端口）、SkillManager（文件操作）、GitService（调用系统 git） |
| **Electron Renderer** | React GUI：技能组管理、安装、同步、设置 |

**通信：** CLI ↔ GUI 通过 `http://localhost:{port}/open?path={cwd}`；端口号持久化在 `~/.skills-manager/.ipc-port`。

## Data Model

### 管理仓库结构 (`~/.skills-manager/`)

```
~/.skills-manager/
├── superpowers/           ← 技能组 (group)
│   ├── brainstorming/     ← 技能 (skill)
│   │   ├── SKILL.md
│   │   └── ... (伴随文件)
│   ├── using-superpowers/
│   └── ...
├── taste-skill/
│   ├── brandkit/
│   └── ...
├── skills-lock.json       ← 技能清单 & 来源追踪
└── .ipc-port             ← IPC 端口缓存 (运行时)
```

### skills-lock.json

```json
{
  "version": 1,
  "groups": {
    "superpowers": {
      "source": "obra/superpowers",
      "sourceType": "github",
      "installedAt": "2026-06-01T10:00:00Z",
      "tags": ["workflow", "core"]
    }
  },
  "skills": {
    "brainstorming": {
      "group": "superpowers",
      "source": "obra/superpowers",
      "skillPath": "skills/brainstorming/SKILL.md",
      "computedHash": "f483c304..."
    }
  }
}
```

- `groups` 记录每个技能组的来源、安装时间、自定义 TAG 标签
- `skills` 记录每个 skill 的归属组、来源路径、内容哈希

### 项目端安装后 (`{project}/.agents/skills/`)

```
{project}/.agents/skills/
├── brainstorming/              ← symlink → ~/.skills-manager/superpowers/brainstorming/
├── using-superpowers/          ← symlink → ~/.skills-manager/superpowers/using-superpowers/
├── brandkit/                   ← symlink → ~/.skills-manager/taste-skill/brandkit/
└── .skills-installed.json
```

安装到项目时去掉 group name，skill 直接放在 `.agents/skills/` 下。

`.skills-installed.json`:
```json
{
  "installedAt": "2026-06-12T09:00:00Z",
  "groups": ["superpowers", "taste-skill"],
  "skills": {
    "brainstorming": {
      "group": "superpowers",
      "target": "~/.skills-manager/superpowers/brainstorming",
      "linkType": "symlink"
    }
  }
}
```

## GUI Design

**风格：** Dark Premium（参考 high-end-visual-design skill）— 深色主题，精致阴影层级，细边框，宽大排版。

**布局：** 左侧 220px 固定侧边栏 + 右侧内容区。

**四个核心视图：**

| 视图 | 侧边栏入口 | 内容 |
|------|-----------|------|
| 技能组列表 (首页) | 「所有技能组」 | 卡片网格展示 group；每卡片含名称、技能数、TAG pills、来源；顶部搜索/筛选栏（按 tag）；右上角「+ 添加技能组」 |
| 技能组详情 | 点击 group 卡片 | 组内所有 skill 列表（名称、路径、hash）；可勾选后安装到项目；项目路径输入框（CLI 传入预填） |
| 同步管理 | 「同步状态」 | Git remote 信息、上次 push/pull 时间、一键 sync 按钮、commit 历史简要 |
| 设置 | 「设置」 | 管理仓库路径、Git remote URL、自动同步开关、Windows 开发者模式指引 |

**交互细节：**
- 侧边栏底部 Git 同步状态指示灯（绿=干净 / 黄=有变更 / 红=冲突）
- 安装时弹窗确认已存在 skill（覆盖/跳过/取消）
- 安装完成底部 toast 通知（X 成功 / Y 失败）

## CLI

**命令：** `skills`

**行为：**
1. 读取 `~/.skills-manager/.ipc-port`
2. 向 `http://localhost:{port}/open?path={cwd}` 发 GET 请求
3. 连接成功 → GUI 窗口置顶，CLI 退出
4. 连接失败 → 启动 Electron 主进程，等待 `.ipc-port` 写入后重试

**安装：**
- Mac: `/usr/local/bin/skills` 软链到 `.app/Contents/Resources/cli`
- Win: 安装器将 `skills.exe` 所在目录加入用户 PATH

## Install Flow (核心)

```
选中技能组 (可多选)
  │
  ├── 1. 解析目标项目路径 (CLI传入优先 > 手动输入 > 上次使用)
  │
  ├── 2. 检查 {project}/.agents/skills/，不存在则创建
  │
  ├── 3. 遍历选中 group 的每个 skill
  │      │
  │      ├── 同分区 → 创建 symlink/junction
  │      └── 跨分区 → 拷贝文件 (GUI 标注「已拷贝」)
  │
  ├── 4. 写入 {project}/.agents/skills/.skills-installed.json
  │
  └── 5. Toast 通知结果
```

**Windows 特别处理：**
- 优先使用 junction（目录软链接，NTFS 原生）
- 权限不足时降级为拷贝；设置页提供「开启 Windows 开发者模式」指引

## Cloud Sync

- `~/.skills-manager/` 作为 Git 仓库，推送到 GitHub 私有仓库
- GUI 提供一键 pull/push，支持自动同步开关
- 冲突时暂停同步，弹出 diff 视图让用户选择保留版本

## Error Handling

| 场景 | 处理 |
|------|------|
| symlink 创建失败 (权限/分区) | 逐 skill 降级：junction → 拷贝；列表标注状态 (`链接`/`已拷贝`/`失败`) |
| Git pull 冲突 | 暂停同步，diff 视图手动选择；技能文件不自动合并 |
| 项目路径不存在 | 安装前校验，红色提示阻止安装 |
| skills-lock.json 损坏 | 启动时校验，损坏则备份为 `.corrupted`，提示重建或恢复 |
| IPC 端口冲突 | 随机端口，冲突自动换 |
| GUI 已运行 | 第二个 `skills` 不重复启动，直接 IPC 置顶窗口 |

## Project Structure

```
skills-manager/
├── package.json
├── electron/
│   ├── main.ts              # Electron 主进程入口
│   ├── ipc-server.ts        # localhost HTTP 服务 (接收 CLI)
│   ├── skill-manager.ts     # 核心：扫描、symlink/拷贝、安装
│   ├── git-service.ts       # Git pull/push/status (调用系统 git CLI)
│   └── preload.ts           # contextBridge
├── renderer/
│   ├── App.tsx              # 路由 + 侧边栏布局
│   ├── pages/
│   │   ├── GroupList.tsx     # 技能组列表首页
│   │   ├── GroupDetail.tsx   # 组详情 + 安装
│   │   ├── SyncPage.tsx      # 同步管理
│   │   └── Settings.tsx      # 设置
│   ├── components/           # TagPill, SkillCard, Toast, StatusDot
│   └── styles/               # Dark Premium 主题
├── cli/
│   └── skills.ts             # CLI 入口
└── resources/
    └── icon.png
```

**技术栈：** Electron + React + TypeScript，系统 Git CLI。

## Testing

| 层级 | 范围 | 工具 |
|------|------|------|
| 单元测试 | skill-manager (路径解析、link 类型判断)、git-service (命令拼接、输出解析) | Vitest |
| 集成测试 | 完整安装流程：扫描 → symlink → 验证 → 写入 json | Vitest + 临时目录 |
| E2E | GUI 核心路径：打开 → 选组 → 安装 → 确认 toast | Playwright + Electron |
| 跨平台 | CI 在 Windows + macOS 跑关键 symlink 路径 | GitHub Actions |

**测试重点：** symlink/copy 降级逻辑、skills-lock.json 异常处理、Git 命令失败时的 UI 表现。
