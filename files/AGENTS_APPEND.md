
---

## Dusty 项目总纲（勿删）

> 项目路径：`E:\ClaudeWork\dusty\`
> 详细产品设计见：`E:\ClaudeWork\dusty\DUSTY_SPEC.md`

### 项目定位

**Dusty**（中文名：扫帚）— 面向普通用户的 Windows 磁盘清理 + 深度卸载工具。
核心功能：软件深度卸载（含注册表/文件/服务残留清理）+ 磁盘成分分析。
UI 风格：米黄暖色调 + 二次元卡通，吉祥物 Dusty 小人贯穿全程。

### 技术栈（不可更改）

| 层 | 技术 | 说明 |
|----|------|------|
| 桌面框架 | Tauri v2 | 轻量，Rust 底层 |
| 前端 | React 18 + TypeScript + Vite | |
| UI 基础 | Tailwind CSS + shadcn/ui | |
| 动画 | Framer Motion | 所有动效 |
| 图表 | Recharts | 饼图 |
| 后端逻辑 | Rust（Tauri Commands） | 扫描/注册表/删除 |
| AI 接口 | DeepSeek API（HTTP，前端调用） | 可选，需用户输入 Key |
| 状态管理 | Zustand | 轻量 |

### 项目目录结构

```
E:\ClaudeWork\dusty\
├── AGENTS.md              ← 就是这个文件
├── DUSTY_SPEC.md          ← 产品设计文档
├── src-tauri\
│   ├── src\
│   │   ├── main.rs
│   │   ├── scanner.rs     ← 文件扫描、体积统计
│   │   ├── classifier.rs  ← 文件分类（6大类）
│   │   ├── app_list.rs    ← 读注册表获取已安装软件
│   │   ├── uninstaller.rs ← 调用官方卸载程序
│   │   ├── residue.rs     ← 残留检测
│   │   ├── staging.rs     ← 暂存区 + rollback日志
│   │   ├── registry.rs    ← 注册表读写封装
│   │   └── ai_bridge.rs   ← AI接口预留（暂为空壳）
│   └── tauri.conf.json
├── src\
│   ├── components\
│   │   ├── Dusty\         ← 吉祥物SVG帧动画（4状态）
│   │   ├── DiskChart\     ← 饼图（一级+二级下钻）
│   │   ├── AppList\       ← 软件列表
│   │   ├── ScanResult\    ← 残留扫描结果
│   │   ├── CleanReport\   ← 清理确认面板
│   │   └── ChatBubble\    ← Dusty 对话气泡
│   ├── pages\
│   │   ├── Home.tsx
│   │   ├── Uninstall.tsx
│   │   ├── DiskClean.tsx
│   │   └── Settings.tsx   ← API Key 输入（默认隐藏AI功能）
│   ├── lib\
│   │   ├── tauri-commands.ts  ← 封装所有 invoke
│   │   └── ai-client.ts       ← DeepSeek 调用（Layer A + B）
│   └── store\
│       └── index.ts           ← Zustand 全局状态
└── rules\
    ├── safe-to-delete.json
    ├── caution.json
    └── never-delete.json
```

### 开发原则（每次任务必须遵守）

1. **基础功能完全离线可用**，AI 是可选增强层，任何核心流程不得依赖 AI 才能完成
2. **用户永远是最终决策者**，AI 不执行删除，只提供建议；删除操作必须经用户点击确认
3. **删除前必须先写 rollback 日志**，再执行操作，确保崩溃可恢复
4. **暂存区优先**：文件先移入 `%APPDATA%\Dusty\staging\`，7天后才真正清除，用户随时可还原
5. **最终删除弹窗必须严肃语气**，明确提示"删除后不可恢复"
6. **Rust 侧每个 Command 必须返回 `Result<T, String>`**，前端统一处理错误
7. **每完成一个可运行的功能单元就 git commit**，commit message 用中文描述功能
8. **遇到以下情况立刻停下，告知用户去问 Claude**：
   - Tauri 权限配置报错（tauri.conf.json allowlist 相关）
   - UAC 提权流程跑不通
   - 注册表写入被拒绝且原因不明
   - Rust 编译报 unsafe 相关错误不知如何处理
   - Windows API 调用返回非预期错误码
   - 任何涉及系统安全边界的不确定操作

### AI 功能约束

**Layer A（分类增强，静默）**
- 只在规则库覆盖不到的文件上触发
- 必须批量合并请求，不得对单个文件单独调用
- 结果必须本地缓存，同一路径不重复调用
- 能用系统规则判断的绝不调 AI

**Layer B（Dusty 对话，用户触发）**
- 每次调用必须注入 system prompt，锁定当前上下文
- system prompt 模板见 `DUSTY_SPEC.md`
- 对话框显示 3 条引导提问示例，用户可直接点击发送
- 越界问题返回固定模板，不得由 AI 自由发挥拒绝语
- API Key 存储在 Tauri 加密 store，不得明文写入任何文件

### Dusty 语气规范

| 场景 | 语气 | 示例 |
|------|------|------|
| 日常提示 | 活泼可爱 | 「嘿！找到 3 个残留文件，要帮你扫走吗～」 |
| AI 建议 | 温和分析 | 「这个文件夹上次访问是 8 个月前，看起来可以清理哦」 |
| 重大操作 | 严肃认真 | 「注意：以下文件删除后将无法恢复，请仔细确认。」 |
| 错误提示 | 困惑可爱 | 「呜，这个文件我动不了，可能需要管理员权限？」 |
| 越界拒绝 | 可爱拒绝 | 「嘿，Dusty 只懂清理方面的问题哦～」 |
| UAC 提权前 | 提前说明 | 「我需要借点权限来打扫这里，马上会弹个确认框，点是就好啦～」 |

### 当前开发阶段

- [ ] Phase 0：项目初始化 + git
- [ ] Phase 1：软件列表扫描（app_list.rs + AppList 组件）
- [ ] Phase 2：深度卸载 + 残留清理
- [ ] Phase 3：磁盘成分分析
- [ ] Phase 4：AI 接入（Dusty 对话）
- [ ] Phase 5：体验打磨 + 打包

> 每完成一个 Phase，在上方打勾并 commit。

### npm 配置（继承全局规则）

项目根目录已有 `.npmrc`：
```
cache=E:/ClaudeWork/npm-cache
```
所有 npm 命令无需额外加 `--cache` 参数。

