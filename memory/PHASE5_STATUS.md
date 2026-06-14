# Dusty Phase 5 状态记录
更新时间：2026-06-14

---

## 已完成项目

### 代码清理（P5-1 ~ P5-2）
- src/index.css 新增语义 token：--safe / --warn / --danger
- 删除 App.css 死代码
- 新建 src/lib/colors.ts：合并 COLORS 和 catColor
- 新建 src/lib/utils.ts：提取 formatSize
- ScanResult 9处 bg-[#xxx] → bg-safe / bg-warn / bg-danger

### 缺失状态补全（P5-3）
- ScanResult：补 loading / error 态
- Settings：补 checking 态 + saveApiKey try/catch
- Uninstall：新增 ErrorRecoveryStep（3阶段错误恢复）
- Home：底部动作栏加 flowError 提示

### 功能完善（P5-5）
- index.css 新增 --text-2xs token
- DiskClean 饼图二级下钻
- ai-client.ts 新增 verifyApiKey()
- 新建 src/components/Onboarding/index.tsx（三步引导，localStorage 持久化）

### UI 改造（P5-8）

#### inline style 全面替换
- DiskClean.tsx / DiskChart/index.tsx / Uninstall.tsx / Settings.tsx / ScanResult/index.tsx / Onboarding/index.tsx
- 全部 Tailwind className → inline style + 硬编码色值
- motion.div → 普通 div，shadcn Button → 原生 button
- recharts 黑框修复：JSX 内嵌 <style> 覆盖 SVG outline
- animate-spin → index.css 自定义 .dusty-spin 类（不依赖 Tailwind utility）

#### 布局统一
- 侧边栏、顶部栏上移到 App.tsx 统一管理
- Home.tsx 只保留搜索区 + 列表区
- App.tsx 侧边栏精简为3项：首页 / 磁盘分析 / 设置

#### DiskClean 全面升级
- 盘符选择行（C/D/E 按钮）
- 扫描缓存提升到 Zustand（useDiskStore），切换页面不重新扫描
  - 根因：display:none 保活方案导致进入 Home 就自动触发扫描，改用 store 缓存
- scanner.rs：real_dir_size_kb 改为 pub(crate)，新增 &mut Vec<LargeFileInfo> 参数
- scanner.rs：新增 scan_disk_inner 内部函数，对外签名不变
- scanner.rs：BFS 遍历时顺带收集 >100MB 单个文件（Documents/Cache/Installer/Other 类）
  - 不在 BFS 内部分类，在 scan_classified 后处理阶段统一调 classify_path + 过滤
  - 最多返回 200 条，按大小降序
- classifier.rs：CategorySummaryList 新增 large_files 字段
- 新建 src-tauri/src/hotspot.rs：7条缓存热点规则
  - Windows临时文件（shallow=true，只统计一层，防止 Temp 目录数十万文件拖慢扫描）
  - Windows错误报告 / NVIDIA Shader缓存 / 缩略图缓存 / Windows更新缓存 / Chrome缓存 / Edge缓存
  - 用 USERPROFILE 环境变量拼路径，与 scanner.rs 保持一致，不引入新依赖
- DiskClean 页面新增三个折叠卡片：缓存热点 / 大型文件 / 可卸载软件（AI标签）
- ai-client.ts 新增 tagApps()（Layer C），给软件打8种分类标签，带内存缓存
- 文案优化：
  - Home页"已安装软件" → "可卸载软件·系统登记在册，支持深度卸载"
  - DiskClean软件卡片加说明：来自系统安装记录，不含绿色软件和部分游戏
  - 缓存热点加标签：全盘检测，与所选盘符无关

### 卸载流程重设计（重要）

#### 问题根因
- 原流程：静默调用卸载程序（/S参数）→ 结果不可靠（部分软件不识别/S）
- split_program_args 按第一个空格切分，导致含空格路径（如 C:\Program Files (x86)\...）
  被切成"C:\Program"（不存在），卸载程序根本没有运行，静默失败
- 暂存区设计：只能移动文件，注册表项无法"移入暂存区"，卸载后注册表记录一直残留

#### 修复与重设计
- uninstaller.rs：split_program_args 改为从右往左逐段尝试找可执行文件路径
  （整串→去最后一个空格前缀→...→兜底第一个空格），以文件系统为 ground truth
- uninstaller.rs：移除所有静默参数追加逻辑，直接弹出官方卸载向导
- uninstaller.rs：新增 verify_uninstalled 命令，检查安装目录+注册表卸载项是否已清理
- residue.rs：新增 delete_residues 命令，直接删除（文件用 fs::remove_dir_all，
  注册表用 registry::delete_key），不经暂存区
- 卸载流程新状态机：idle→uninstalling→verifying→verify_failed/scanning→review→deleting→done
  - verify_failed：软件仍然存在，提示用户重试或取消
  - review：展示残留列表，"清理残留"或"跳过，不管了"
  - 残留不再移入暂存区，用户确认后直接删除
- Onboarding 第三步加"不再提示"，Settings 加"重置引导"按钮

### UAC 提权
- 根因：装在 Program Files 的软件卸载程序需要管理员权限，
  Command::new 不触发 UAC，子进程静默失败
- 方案：嵌入 requireAdministrator 清单，Dusty 启动时弹一次 UAC，全程有效
- 实现：src-tauri/app-manifest.xml + build.rs 的 WindowsAttributes::app_manifest()
  （tauri-build 内置 API，避免 winres/embed_resource 与 tauri-build 的 VERSION 资源冲突）
- tauri dev 必须在管理员终端启动，否则卸载向导不弹

### 代码审计清理
- 删除死文件：src/components/AppList/ / ChatBubble/ / ui/button.tsx / pages/Staging.tsx
- 修复 DiskClean.tsx 两处 className（space-y-5 pt-4 / space-y-2 → inline style）
- animate-spin → .dusty-spin（index.css 自定义 keyframes，不依赖 Tailwind）
- 删除 store 中的 filteredApps 方法（Home.tsx 内联过滤）
- 删除 DoneStep 的"查看暂存区"按钮

### 收尾（P5-9）
- tauri-commands.ts 删除 8 个无人使用的死导出
- Bug 3 修复：Rust EstimatedSize=0 时回退读取安装目录实际大小

---

## 已知问题与注意事项

### 🟡 饼图黑框（已临时修复）
- 方案：DiskChart/index.tsx 最外层容器内加 <style> 覆盖 SVG outline
- 如出现渲染问题可改用 isAnimationActive={false}

### 🟡 大型文件收集只含真实单个文件（目录不含）
- BFS 遍历时收集 >100MB 的单个文件，Software/System 分类过滤掉
- 游戏目录（如 D:\WutheringWaves）作为整体被归为 Other 目录，不会出现在大型文件里
- 这是设计决定：大型文件列表只展示，不提供清理操作

### 🟡 软件列表 vs 分类明细·软件程序 数字不一致
- 可卸载软件：注册表来源，部分绿色软件/游戏本体不在列表
- 软件程序（扫描）：磁盘实际占用，更接近真实空间
- 两者口径不同，已在 UI 加说明文字，用户理解成本可接受

### ✅ 已解决
- 白边 / 滚动条 / DustyBar 底部固定 / 右侧内容截断 / 饼图黑框 / split_program_args
- 卸载后软件仍显示在列表：卸载完成后调 fetchApps() 刷新
- 软件大小显示 0 KB：Rust 侧 EstimatedSize 为 0 时回退读取安装目录实际大小

---

## 吉祥物资产（待集成）

四张 PNG 已生成，需手动放入 `src/assets/dusty/` 后 CC 才能集成：
- idle.png / sweeping.png / celebrate.png（黑底，mix-blend-mode: screen）
- warning.png（白底，mix-blend-mode: multiply）

---

## 已确立的 Tauri WebView 兼容规则

1. 所有样式用 inline style + 硬编码色值
2. 图标用 style={{ width, height }}，不用 className
3. 按钮用原生 <button>，不用 shadcn Button
4. motion.div 全部改为普通 div
5. 旋转动画用 index.css 自定义 .dusty-spin，不用 animate-spin
6. recharts 需在容器内加 <style> 覆盖 SVG outline
7. flex:1 子容器必须加 minWidth:0
8. BFS 扫描加 HashSet 路径去重，防止 junction point 死循环

---

## 环境信息

- 工作目录：E:\ClaudeWork\dusty
- 打包输出：src-tauri\target\release\bundle\nsis\
- 开发预览：npm run dev → localhost:1420
- tauri dev：必须在**管理员终端**启动（requireAdministrator 清单已嵌入）
- DeepSeek API 余额：注意监控（曾出现 402）
- npm cache：E:/ClaudeWork/npm-cache（.npmrc 已配置）
- 系统 DPI：125%（AppliedDPI=120），窗口逻辑尺寸 920×660
