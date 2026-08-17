# dsh-plugin-task-panel

> 优雅的任务摘要与上下文用量监控浮动面板（DeepSeek Harness 专属插件）。

![预览图](./assets/preview.png)

---

## 🌟 功能特性 (Features)

1. **📋 待办事项实时跟踪 (Todo Tracking)**
   - 自动提取并同步当前会话的 `todo_write` 任务清单。
   - 实时显示任务状态（`pending`、`in_progress` 进行中、`completed` 已完成）。
   - 包含动画指示器与进度统计。

2. **📊 上下文与 Token 精细化分析 (Context & Token Breakdown)**
   - **上下文进度条**：直观展示当前上下文占用窗口比例。
   - **【文件】标签页**：
     - 显示对话/文件读写占用的 Token 量与比例（如 `1.2K · 0%`）。
     - 支持切换查看 **输出 (Output)** 与 **读取 (Read)** 的文件列表，点击即可直接在工作区打开查看。
   - **【其他】标签页**：
     - 显示系统提示词（System Prompt）、工具函数定义（Tools Schema）等占用的 Token 量与比例（如 `13K · 5%`）。
     - 展示详细的 KV 缓存命中指标（Cache Read、Cache Write 等）。

3. **🎨 极致交互体验 (Interactive UI/UX)**
   - **快捷键支持**：随时使用 `Ctrl + Alt + B`（或 Mac 上的 `Cmd + Alt + B`）一键切换面板显隐。
   - **顶部操作栏图标**：在会话顶部工具栏集成折叠/展开快捷按钮。
   - **8向自由调整大小 (8-way Resizing)**：面板边框支持自由拖拽缩放（东、南、西、北及4个对角角标）。
   - **原生无缝主题**：自动适配 DeepSeek Harness 的明亮/暗黑主题变量。

---

## 📦 安装与配置 (Installation)

### 方式一：作为桌面端 Profile 插件安装（推荐，重启常驻）

1. **克隆或下载插件到 profile 插件目录**：
   ```bash
   cd ~/.dsh/profiles/desktop/plugins
   git clone https://github.com/xiaogu619520/dsh-plugin-task-panel.git
   ```

2. **在 `~/.dsh/profiles/desktop/cordis.patch.yml` 中启用插件**：
   ```yaml
   insert:
     task-panel-surface:
       package: dsh-plugin-task-panel
   ```

3. **在 `~/.dsh/profiles/desktop/package.json` 中添加依赖**：
   ```json
   {
     "dependencies": {
       "dsh-plugin-task-panel": "file:./plugins/dsh-plugin-task-panel"
     }
   }
   ```

4. 重启 DeepSeek Harness 即可生效。

---

### 方式二：动态运行时挂载（无需重启）

在 DSH 对话中直接让 Agent 挂载动态包，或在 Cordis 控制台引入即可。

---

## ⌨️ 快捷键 (Shortcuts)

| 快捷键 | 功能 |
| :--- | :--- |
| `Ctrl + Alt + B` / `Cmd + Alt + B` | 打开 / 关闭任务摘要面板 |

---

## 📄 开源协议 (License)

[MIT License](./LICENSE)
