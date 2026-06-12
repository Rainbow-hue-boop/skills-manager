# Skills Manager

跨平台桌面应用，用于可视化管理 [opencode](https://github.com/anomalyco/opencode) 的 agent skills。支持按技能组组织、通过 symlink 快速安装到项目、Git 云端同步。

## 功能

- **技能组管理** — 按 group 组织 skills，支持自定义 TAG 标签，搜索/筛选
- **一键安装** — symlink（同分区零磁盘占用）或自动降级拷贝，安装到 `{project}/.agents/skills/`
- **Git 云端同步** — 一键 pull/push，跨设备同步技能库
- **CLI 快捷入口** — 项目目录下执行 `skills` 唤起 GUI 并自动填入路径
- **跨平台** — Windows + macOS，符号链接/junction 自动适配

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 打包 (Windows)
npm run package:win

# 打包 (macOS)
npm run package:mac

# 运行测试
npm test
```

## 使用方式

### GUI

启动应用后：

1. **添加技能组** — 点击「+ 添加技能组」，选择包含 `SKILL.md` 的文件夹，输入组名
2. **安装到项目** — 点击技能组 → 输入项目路径 → 点击「安装到项目」
3. **同步** — 在设置中配置 Git 远程仓库地址，点击「立即同步」

### CLI

在任意项目目录下：

```bash
skills
```

自动唤起 GUI 并传递当前目录作为安装目标路径。

## 技能仓库结构

```
~/.skills-manager/
├── superpowers/          ← 技能组
│   ├── brainstorming/    ← 技能（含 SKILL.md）
│   └── ...
├── taste-skill/
├── skills-lock.json      ← 技能清单
└── .ipc-port            ← CLI 通信端口
```

## 技术栈

- Electron 33 + React 18 + TypeScript 5
- electron-vite（构建）
- Vitest + Playwright（测试）
- electron-builder（打包）
- 深色高保真 UI（Dark Premium）

## 许可

MIT
