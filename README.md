# dsh-plugin-task-panel

> 优雅的任务摘要与上下文用量监控浮动面板（DeepSeek Harness 专属插件）。

![预览图](./assets/preview.png)

---

## ⚡ AI 一键安装 (One-Click AI Install)

在任意 DeepSeek Harness 会话中，直接把下面这句话（或本仓库链接）发给 AI，AI 会全自动为你配置并启用插件：

```text
帮我安装并启用这个 DSH 插件：https://github.com/xiaogu619520/dsh-plugin-task-panel.git
```

> **AI 将自动完成**：克隆插件到 Profile 目录、配置 `cordis.patch.yml` 注入点、建立依赖关系并热加载生效。

---

## 🌟 功能特性 (Features)

1. **📋 待办事项实时跟踪 (Todo Tracking)**
   - 自动提取并同步当前会话的 `todo_write` 任务清单。
   - 实时显示任务状态（`pending`、`in_progress` 进行中、`completed` 已完成）。
   - 包含动态进度与条目统计。

2. **📊 上下文与 Token 精细化分析 (Context & Token Breakdown)**
   - **上下文用量进度条**：直观展示当前会话上下文占窗口总量的比例。
   - **【文件】标签页**：
     - 显示对话/文件读写占用的 Token 量与百分比（如 `1.2K · 0%`）。
     - 支持切换查看 **输出 (Output)** 与 **读取 (Read)** 的文件列表，点击即可直接在工作区打开查看。
   - **【其他】标签页**：
     - 显示系统提示词（System Prompt）、工具函数定义（Tools Schema）等占用的 Token 量与比例（如 `13K · 5%`）。
     - 展示详细的 KV 缓存命中指标（Cache Read、Cache Write 等）。

3. **🎨 极致交互体验 (Interactive UI/UX)**
   - **快捷键一键呼出**：随时使用 `Ctrl + Alt + B`（或 Mac 上的 `Cmd + Alt + B`）快速显示/隐藏面板。
   - **顶部操作栏图标**：在会话顶部操作栏无缝集成快捷切换按钮。
   - **8向自由调整大小 (8-way Resizing)**：面板边框支持自由拖拽缩放（东、南、西、北及4个对角角标）。
   - **原生无缝主题**：自动适配 DeepSeek Harness 的明亮/暗黑主题变量。

---

## 🛠️ 手动安装 (Manual Installation)

如果你偏好手动配置，请按以下步骤操作：

1. **克隆插件到桌面 Profile 目录**：
   ```bash
   cd ~/.dsh/profiles/desktop/plugins
   git clone https://github.com/xiaogu619520/dsh-plugin-task-panel.git
   ```

2. **在 `~/.dsh/profiles/desktop/cordis.patch.yml` 中添加插件注入点**：
   ```yaml
   insert:
     task-panel-surface:
       package: dsh-plugin-task-panel
   ```

3. **在 `~/.dsh/profiles/desktop/package.json` 中声明依赖**：
   ```json
   {
     "dependencies": {
       "dsh-plugin-task-panel": "file:./plugins/dsh-plugin-task-panel"
     }
   }
   ```

4. 重启 DeepSeek Harness 即可生效。

---

## ⌨️ 快捷键 (Shortcuts)

| 快捷键 | 功能 |
| :--- | :--- |
| `Ctrl + Alt + B` / `Cmd + Alt + B` | 打开 / 关闭任务摘要面板 |

---

## 📄 开源协议 (License)

[MIT License](./LICENSE)
