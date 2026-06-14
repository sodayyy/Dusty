## 零、规则写入位置

新规则、经验、约束一律写入本文件（`dusty/CLAUDE.md`）。
不得写入 AGENTS.md，不得创建任何 `*_APPEND.md` 文件。

---

# CLAUDE.md — Dusty 项目规则

> 产品细节见 DUSTY_SPEC.md，本文件只放 CC 每次任务必须遵守的行为规则。

---

## 一、开发原则

1. **基础功能完全离线可用**，AI 是可选增强层，核心流程不得依赖 AI
2. **用户永远是最终决策者**，AI 不执行删除，只提供建议；删除必须经用户确认
3. **删除前必须先写 rollback 日志**，再执行操作，确保崩溃可恢复
4. **残留直接删除**：卸载后残留文件/注册表项由用户确认后直接删除，不再走暂存区流程。
   暂存区代码（staging.rs、Staging.tsx）保留但卸载主流程不使用。
5. **最终删除操作必须严肃语气**，明确提示「删除后不可恢复」
6. **Rust 侧每个 Command 必须返回 `Result<T, String>`**，前端统一处理错误
7. **每完成一个可运行的功能单元就 git commit**，commit message 用中文描述功能

---

## 二、遇到以下情况立刻停下，告知用户去问 Claude

- Tauri 权限配置报错（tauri.conf.json allowlist 相关）
- 注册表写入被拒绝且原因不明
- Rust 编译报 unsafe 相关错误
- Windows API 调用返回非预期错误码
- 任何涉及系统安全边界的不确定操作
- 卸载流程中卸载程序未弹出 UI（可能是路径解析或权限问题）

---

## 三、任务通知机制

- 完成：`powershell -File E:/ClaudeWork/dusty/scripts/toast.ps1 -Type done -Text "完成了什么"`
- 卡住：`powershell -File E:/ClaudeWork/dusty/scripts/toast.ps1 -Type stuck -Text "卡在哪里"`

---

## 四、Tauri WebView 样式约束（长期有效）

1. **颜色优先用内联 style 硬编码**：Tailwind v4 在 Tauri 环境下 class 解析不稳定，
   UI 一律用 inline style + 硬编码色值。色值对照见 DUSTY_SPEC.md 色板。
   - 已知可用的语义 class：`bg-safe` / `bg-warn` / `bg-danger`
   - 动画 class：`dusty-spin`（在 index.css 自定义，不依赖 Tailwind）
2. **改前先列计划**：修改任何页面/组件前，先列出改动文件、内容、理由，等用户确认
3. **Core/Engine 只读**：`src/core/` 和 `src/engine/` 下的文件不得改动
4. **吉祥物资产搁置**：遇到吉祥物相关任务，停下来提示用户，不自行生成
5. **逐页交付**：每完成一个页面，输出改动文件列表 + 每文件变更摘要
6. **shadcn Button 组件禁用**：一律改用原生 `<button>` + inline style
7. **lucide-react 图标禁用 className**：尺寸一律用 `style={{ width, height }}`
8. **Framer Motion motion.div 禁用**：改为普通 div，动画用 CSS transition

---

## 五、Framer Motion 使用限制

- **禁止**：`AnimatePresence` 包裹列表或网格类组件（已知会导致子元素不渲染）
- **禁止**：`motion.div`（Tauri WebView 下有渲染问题）
- 遇到动画需求：改用 CSS `transition` + state 切换，或 index.css 自定义 keyframes

---

## 六、npm 配置

项目根目录已有 `.npmrc`：
```
cache=E:/ClaudeWork/npm-cache
```
所有 npm 命令走此缓存，不得使用默认缓存路径。

---

## 七、技术债备注（已知，暂不处理）

- **Onboarding 持久化**：当前用 `localStorage`，未使用 `tauri-plugin-store`。1.x 统一处理

---

## 八、布局规范

### 窗口
- 尺寸：920×660 逻辑像素（系统 125% 缩放后物理像素为 1150×825，属正常）
- `resizable: false`，`maximizable: false`

### 根容器层级（必须严格遵守）
```
html / body / #root
  → overflow: hidden，height: 100%，background: #FAF6EF

App.tsx 最外层
  → height: 100vh，overflow: hidden

各页面最外层
  → display: flex，height: 100%，overflow: hidden

右侧内容区
  → display: flex，flexDirection: column，flex: 1，height: 100%，overflow: hidden
  → 子结构：顶部栏(flexShrink:0) + 内容区(flex:1, overflowY:auto) + DustyBar(flexShrink:0)
```

### 侧边栏（当前3项）
- 首页（Home）/ 磁盘分析（DiskClean）/ 设置（Settings）
- 卸载流程从 Home 页触发，全屏模式运行，不占侧边栏入口

### DustyBar 布局
- 必须是右侧 flex 容器的**直接子元素**，不能包在列表滚动容器内
- 主操作行：Dusty图标(flexShrink:0) + 气泡(flex:1, maxWidth:45%) + 操作区(marginLeft:auto, flexShrink:0)

---

## 九、UAC 与权限

- **Dusty 以管理员身份运行**：`src-tauri/app-manifest.xml` 声明 `requireAdministrator`，
  通过 `build.rs` 的 `WindowsAttributes::app_manifest()` 嵌入二进制。
- **tauri dev 必须在管理员终端启动**：普通终端跑出的进程权限不足，卸载向导无法弹出。
- **不使用 runas 子进程**：整体提权比动态提权更简单可靠，已验证可行。
- UAC 只在启动时弹一次，session 内全程有效。

---

## 十、前端开发流程

```
v0.dev 出原型
  → npm run dev 浏览器预览确认视觉（管理员终端）
  → CC 接入真实 store/invoke 数据
  → tauri build 打包在真实窗口验证
```

注意：npm run dev 下 invoke() 全部失效属正常，视觉确认在浏览器做，功能联调在 tauri dev 或打包后做。
