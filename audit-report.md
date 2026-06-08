# Dusty UI 现状审计报告

> 生成时间：2026-06-08 | 审计范围：`src/` 全部前端文件 | 只读，未修改任何源文件

---

## 1. 页面清单

| 页面文件 | 功能 | 路由触发 | 完成度 |
|----------|------|----------|--------|
| `src/pages/Home.tsx` | 主页：Header + 软件列表 + 底部卸载动作栏 + 导航按钮（磁盘分析/设置） | 默认页 | 半成品 |
| `src/pages/Uninstall.tsx` | 卸载流程 6 步页面（确认→卸载中→扫描→勾选残留→移入暂存→完成） | 选中软件→点"深度卸载" | 接近完成 |
| `src/pages/DiskClean.tsx` | 磁盘成分分析页：自动扫描默认路径 + 饼图 + 分类明细列表 | 首页点"磁盘分析" | 半成品 |
| `src/pages/Settings.tsx` | 设置页：DeepSeek API Key 输入/保存/显隐切换 + 关于信息 | 首页点齿轮图标 | 半成品 |

**页面评分标准**：毛坯 = 骨架在但交互/状态不全 | 半成品 = 主要流程完整但缺边界态/UI 细节 | 接近完成 = 流程+状态+动画齐备

---

## 2. 组件清单

| 组件目录 | 用途 | 被引用方 |
|----------|------|---------|
| `src/components/AppList/index.tsx` | 软件列表：搜索框 + 统计 + 卡片列表 + 选中高亮 + 加载/错误/空搜索三态 | `Home.tsx` |
| `src/components/ScanResult/index.tsx` | 残留清单：安全三色标记 + 分类图标 + 复选框选择 + 空态 | `Uninstall.tsx` (内嵌) |
| `src/components/DiskChart/index.tsx` | Recharts 环形饼图：hover 高亮 + 图例点击 + Tooltip + 中心标签 | `DiskClean.tsx` |
| `src/components/ChatBubble/index.tsx` | Dusty AI 浮动聊天面板：消息列表 + 引导提问 + loading态 + 无 Key 隐藏 | `App.tsx` (全局) |
| `src/components/ui/button.tsx` | shadcn Button 组件（@base-ui/react button） | **未被任何页面引用** |
| `src/components/Dusty/` | 吉祥物 SVG 帧动画 | **不存在（空目录/未创建）** |

---

## 3. 样式现状

### 3.1 全局变量体系

- **`src/theme.ts`**：不存在 ❌
- **`src/index.css`**：唯一的样式入口，使用 Tailwind CSS v4 + shadcn/tailwind.css。通过 `@theme inline` 将 CSS 变量映射为 Tailwind token（`--color-*`、`--radius-*`）。`:root` 中定义了 Dusty 品牌色板，语义化变量名（`--background`、`--primary`、`--destructive` 等），**变量体系本身完整但缺乏独立的 theme.ts 文件**

### 3.2 全局 CSS 变量色值一览（:root）

| 变量 | 色值 | DUSTY_SPEC 对应 |
|------|------|----------------|
| `--background` | `#FAF6EF` | `--bg-main` 米黄暖白 |
| `--foreground` | `#3D2C1E` | `--text-main` 深咖啡 |
| `--card` | `#FFF8EE` | `--bg-card` 奶油白 |
| `--primary` | `#E8A87C` | `--color-dusty` 暖橙 |
| `--secondary` | `#F0C070` | `--color-warn` 蜂蜜黄 |
| `--muted` | `#EDE0D0` | `--border` 暖米色 |
| `--muted-foreground` | `#8A7060` | `--text-muted` 浅咖啡 |
| `--destructive` | `#E07060` | `--color-danger` 砖红 |
| `--border` | `#EDE0D0` | `--border` 暖米色 |
| `--chart-1` | `#E8A87C` | Dusty 主色 |
| `--chart-2` | `#6DBF9E` | `--color-safe` 薄荷绿 |
| `--chart-3` | `#F0C070` | `--color-warn` |
| `--chart-4` | `#E07060` | `--color-danger` |
| `--chart-5` | `#8A7060` | `--text-muted` |

### 3.3 Tailwind CSS 变量已注册的 token

通过 `@theme inline` 注册的 Tailwind token（代码中可直接用 `bg-background`、`text-primary`、`border-border` 等）：

`background` `foreground` `card` `card-foreground` `popover` `popover-foreground` `primary` `primary-foreground` `secondary` `secondary-foreground` `muted` `muted-foreground` `accent` `accent-foreground` `destructive` `border` `input` `ring` `chart-1` ~ `chart-5` `sidebar` `sidebar-foreground` `sidebar-primary` `sidebar-primary-foreground` `sidebar-accent` `sidebar-accent-foreground` `sidebar-border` `sidebar-ring`

### 3.4 硬编码颜色值（违规，应迁移到 theme.ts）

**A. 直接在 TSX 中用 Tailwind arbitrary values `bg-[#xxx]` / `text-[#xxx]`**

| 文件 | 行号 | 代码 | 应改为 |
|------|------|------|--------|
| `src/components/ScanResult/index.tsx` | 17 | `"bg-[#6DBF9E]/10"` | 引用 `chart-2` 或新增 `--color-safe` Tailwind token |
| `src/components/ScanResult/index.tsx` | 18 | `"text-[#6DBF9E]"` | 同上 |
| `src/components/ScanResult/index.tsx` | 19 | `"border-[#6DBF9E]/30"` | 同上 |
| `src/components/ScanResult/index.tsx` | 23 | `"bg-[#F0C070]/10"` | 引用 `chart-3` 或新增 `--color-warn` token |
| `src/components/ScanResult/index.tsx` | 24 | `"text-[#F0C070]"` | 同上 |
| `src/components/ScanResult/index.tsx` | 25 | `"border-[#F0C070]/30"` | 同上 |
| `src/components/ScanResult/index.tsx` | 29 | `"bg-[#E07060]/10"` | 引用 `chart-4` 或新增 `--color-danger-bg` token |
| `src/components/ScanResult/index.tsx` | 30 | `"text-[#E07060]"` | 同上 |
| `src/components/ScanResult/index.tsx` | 31 | `"border-[#E07060]/30"` | 同上 |

**B. 直接在 TS/TSX 中用 hex 字符串（style={{ backgroundColor: "#xxx" }}）**

| 文件 | 行号 | 代码 | 应改为 |
|------|------|------|--------|
| `src/components/DiskChart/index.tsx` | 6-13 | `COLORS` 对象含 6 个 hex | 统一从 theme 引用 |
| `src/pages/DiskClean.tsx` | 148-156 | `catColor()` 函数含 6 个 hex | 重复定义，应与 DiskChart 共用同一份颜色常量 |
| `src/pages/Home.tsx` | 65 | `bg-destructive text-white` | `text-white` 非 Dusty 色板，应改为 `text-primary-foreground` |

**C. 废弃文件中的硬编码颜色**

| 文件 | 问题 |
|------|------|
| `src/App.css` | Tauri 默认模板残留，含 `#747bff` `#61dafb` `#0f0f0f` `#f6f6f6` `#646cff` `#535bf2` `#ffffff` `#396cd8` `#e8e8e8` `#24c8db` `#2f2f2f` — **此文件已被 App.tsx 移除引用，属于死代码** |

### 3.5 硬编码字号/间距/圆角值

| 文件 | 行号 | 硬编码值 | 类型 |
|------|------|----------|------|
| `src/pages/Uninstall.tsx` | 313 | `text-[10px]` | 字号（StatBadge label） |
| `src/components/ScanResult/index.tsx` | 115 | `text-[10px]` | 字号（路径文本） |
| `src/components/ScanResult/index.tsx` | 124 | `text-[10px]` | 字号（安全标签） |
| `src/components/ChatBubble/index.tsx` | 97 | `text-[10px]` | 字号（副标题） |
| `src/components/ChatBubble/index.tsx` | 90 | `w-[360px]` `h-[480px]` `max-w-[calc(100vw-40px)]` `max-h-[calc(100vh-120px)]` | 聊天面板尺寸 |
| `src/pages/Home.tsx` | 65 | `text-white` | 非语义化文本色 |
| `src/components/DiskChart/index.tsx` | 52-53 | `innerRadius={60}` `outerRadius={95/103}` | 饼图几何参数（可接受，属图表组件内部配置） |
| `src/index.css` | 75 | `--radius: 0.75rem` | 全局圆角基数，OK |

---

## 4. 缺失项 —— 逐组件 UI 状态覆盖审计

| 组件/页面 | 加载中 | 空数据 | 错误/失败 | 备注 |
|-----------|--------|--------|-----------|------|
| **AppList** | ✅ 有（Loader2 + 文字） | ✅ 有（空搜索结果） | ✅ 有（错误 + 重试按钮） | 三态齐全 |
| **ScanResult** | ❌ 缺失 | ✅ 有（"没有发现残留"） | ❌ 缺失 | 无法获知扫描失败后的状态；残留在 store.flowError 中但 ScanResult 不显示 |
| **DiskChart** | ❌ 缺失 | ❌ 缺失（由父组件 DiskClean 处理） | ❌ 缺失（由父组件 DiskClean 处理） | 纯展示组件，边界态依赖父组件 |
| **DiskClean** | ✅ 有（Loader2 + 文字） | ✅ 有（HardDrive 图标 + 文字） | ✅ 有（error + 重试按钮） | 三态齐全 |
| **ChatBubble** | ✅ 有（loading dots） | ✅ 有（欢迎语 + 引导问题） | ✅ 有（错误消息显示在气泡中） | 三态齐全，但无重试按钮 |
| **Settings** | ❌ 缺失（初始加载 Key 状态无指示） | N/A | ❌ 缺失（保存失败无提示） | `saveApiKey` 无 try/catch，静默失败 |
| **Uninstall** | ✅ 有（3 个 LoadingStep） | ⚠️ 部分（无残留时有 ScanResult 空态） | ❌ 缺失 | flowError 只在 ConfirmStep 和 ReviewStep 展示；uninstalling/scanning/staging 阶段出错后无法恢复 |
| **Home** | ❌ 缺失（AppList 内部处理） | ✅ 有（AppList 内部处理） | ❌ 缺失（AppList 内部处理） | 底部动作栏选中后无任何加载/错误反馈 |

**汇总：完成率 8/14 ≈ 57%**

---

## 5. 吉祥物现状

- `src/components/Dusty/` — **目录不存在，未创建**
- DUSTY_SPEC.md 定义了 4 个动画状态：`idle` `sweeping` `celebrate` `warning`
- 实现方式规定为「纯 SVG + CSS @keyframes，不引入图片资源」
- 当前项目中**完全没有吉祥物相关的任何代码**
- 所有页面均无吉祥物展示

---

## 6. 各页面完成度评分

| 页面 | 评分 | 理由 |
|------|------|------|
| **Home** | 半成品 | 核心流程完整、三态齐全；但缺少吉祥物、磁盘清理快捷入口不明显、无首次启动 Onboarding |
| **Uninstall** | 接近完成 | 6 步流程完整、动画流畅；但 loading/staging 阶段无错误恢复、缺少崩溃恢复 UI、无进度百分比 |
| **DiskClean** | 半成品 | 扫描 + 饼图 + 分类列表可运行；但无二级下钻（点击饼图扇形展开详情）、无清理建议、无扫描进度 |
| **Settings** | 半成品 | API Key 存取可用；但保存失败静默、无 Key 验证（调用 API 测试是否有效）、缺少中文界面 |

---

## 7. 其他发现

- **`src/App.css`**：死代码，App.tsx 已移除引用，但文件仍保留在项目中
- **`src/components/ui/button.tsx`**：shadcn 通用 Button 组件已创建，但所有页面都用原生 `<button>` 而非此组件
- **`formatSize` 函数**：在 AppList、Uninstall、DiskClean、DiskChart 中分别重复定义（4 处相同逻辑），应提取到 `src/lib/utils.ts`
- **`catColor` 函数**：DiskClean 和 DiskChart 中各自维护一份颜色映射（COLORS 对象 vs catColor 函数），应统一
- **无路由库**：通过 useState 切换页面，无 URL 持久化，刷新后回到首页

---

> 审计完毕，未修改任何源文件。
