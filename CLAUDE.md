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
4. **暂存区优先**：文件先移入 `%APPDATA%\Dusty\staging\`，7天后才真正清除，用户随时可还原
5. **最终删除弹窗必须严肃语气**，明确提示「删除后不可恢复」
6. **Rust 侧每个 Command 必须返回 `Result<T, String>`**，前端统一处理错误
7. **每完成一个可运行的功能单元就 git commit**，commit message 用中文描述功能

---

## 二、遇到以下情况立刻停下，告知用户去问 Claude

- Tauri 权限配置报错（tauri.conf.json allowlist 相关）
- UAC 提权流程跑不通
- 注册表写入被拒绝且原因不明
- Rust 编译报 unsafe 相关错误
- Windows API 调用返回非预期错误码
- 任何涉及系统安全边界的不确定操作

---

## 三、任务通知机制

- 完成：`powershell -File E:/ClaudeWork/dusty/scripts/toast.ps1 -Type done -Text "完成了什么"`
- 卡住：`powershell -File E:/ClaudeWork/dusty/scripts/toast.ps1 -Type stuck -Text "卡在哪里"`

---

## 四、Phase 5 约束（UI 精修阶段）

1. **颜色只用语义 token**：所有色值只能用 `src/index.css` 中已注册的 Tailwind 语义 class（`bg-primary` / `text-foreground` / `bg-destructive` / `bg-safe` / `bg-warn` / `bg-danger` 等），禁止使用 `bg-[#xxx]` / `text-[#xxx]` arbitrary values 和任何内联 `style` 色值
   - **已知例外**：`Home.tsx` 底部操作栏暂用内联 style 硬编码色值（`#FFF8EE` / `#EDE0D0` / `#3D2C1E` / `#E8A87C`），绕过 AnimatePresence 渲染问题，代码内有 TODO 注释标记，待后续统一处理
2. **改前先列计划**：修改任何页面/组件前，先列出改动文件、内容、理由，等用户确认
3. **Core/Engine 只读**：`src/core/` 和 `src/engine/` 下的文件不得改动
4. **吉祥物 SVG 搁置**：遇到吉祥物相关任务，停下来提示用户，不自行生成
5. **逐页交付**：每完成一个页面，输出改动文件列表 + 每文件变更摘要

---

## 五、Framer Motion 使用限制

- **允许**：单个元素的 fade / slide / scale 动画（`motion.div` 包裹单个组件）
- **禁止**：`AnimatePresence` 包裹列表或网格类组件
  （已知会导致子元素不渲染，根因见 Home.tsx Bug 1 修复记录）
- 遇到列表动画需求：改用 CSS `transition` + `className` 切换实现

---

## 六、npm 配置

项目根目录已有 `.npmrc`：
```
cache=E:/ClaudeWork/npm-cache
```
所有 npm 命令走此缓存，不得使用默认缓存路径。

---

## 七、技术债备注（已知，暂不处理）

- **Onboarding 持久化**：当前用 `localStorage` 记录首次启动状态，未使用 `tauri-plugin-store`。功能正常，1.x 版本统一持久化方案时一并处理
- **AppList store 解构**：`useAppStore()` 全量解构无 selector，性能次优，后期优化
