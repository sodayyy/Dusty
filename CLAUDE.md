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

1. **颜色只引用变量**：所有色值只能从 `src/theme.ts` 引用，禁止硬编码任何颜色值
2. **改前先列计划**：修改任何页面/组件前，先列出改动文件、内容、理由，等用户确认
3. **Core/Engine 只读**：`src/core/` 和 `src/engine/` 下的文件不得改动
4. **吉祥物 SVG 搁置**：遇到吉祥物相关任务，停下来提示用户，不自行生成
5. **逐页交付**：每完成一个页面，输出改动文件列表 + 每文件变更摘要

---

## 五、npm 配置

项目根目录已有 `.npmrc`：
```
cache=E:/ClaudeWork/npm-cache
```
所有 npm 命令走此缓存，不得使用默认缓存路径。
