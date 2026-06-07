# Dusty 项目交接 · CC 接手说明

## 项目位置
E:\ClaudeWork\dusty\

## 产品设计文档
E:\ClaudeWork\dusty\DUSTY_SPEC.md （完整产品设计，遇到不确定的设计决策看这里）

## 当前技术栈
- Tauri v2 + React 18 + TypeScript + Vite
- Tailwind CSS v4 + shadcn/ui + Framer Motion + Recharts + Zustand
- Rust 后端（Tauri Commands）
- winreg = "0.54.0" / walkdir / tauri-plugin-fs / tauri-plugin-shell

## Phase 0 已完成
项目骨架、所有依赖安装、Tauri 配置、npm run tauri dev 窗口已成功弹出。

## Phase 1 Task 1 阻塞中，需要你接手修复

### 已完成的文件
- src-tauri/src/lib.rs ✅（已注册 get_installed_apps command）
- src/lib/tauri-commands.ts ✅（前端封装已写好）
- src/App.tsx ✅（已加 useEffect console.log 验证）

### 唯一卡点：app_list.rs 编译报错
文件位置：src-tauri/src/app_list.rs
问题：winreg 0.54 不导出 HKEY 类型，Codex 用了不存在的类型导致编译失败。

### 正确写法关键点
winreg 0.54 的用法：
- 用 `RegKey::predef(HKEY_LOCAL_MACHINE)` 传常量，不要引用 HKEY 类型
- 常量从 `winreg::enums::*` 导入
- 具体：`use winreg::RegKey; use winreg::enums::*;`

### AppInfo 结构体
```rust
pub struct AppInfo {
    pub name: String,
    pub publisher: String,
    pub version: String,
    pub install_date: String,
    pub install_location: String,
    pub uninstall_string: String,
    pub size_kb: u64,
}
```

### 要读取的三个注册表路径
- HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
- HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall
- HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall

### 过滤规则
- 跳过没有 DisplayName 的条目
- 跳过 SystemComponent = 1 的条目
- 去重（同名只保留一条）
- 按 name 字母排序返回

## 任务
1. 重写 app_list.rs，修复编译问题
2. cargo build 验证能编译通过
3. npm run tauri dev 启动，打开浏览器控制台确认 console.log 输出了真实软件列表
4. git commit -m "Phase 1：实现注册表读取软件列表"

## 重要：文件写入限制
项目在 E 盘，不在你的沙箱白名单里。
所有代码以「输出到对话」方式交付，由用户手动保存到对应路径。
每次输出请标注：完整文件路径 + 完整代码，不要省略任何部分。

## 遇到以下问题停下来告诉用户，由用户去问 Claude 再回来
- 注册表读取权限被拒绝
- Tauri command 注册失败
- 任何看不懂的 Rust 编译错误
- Windows API 返回非预期错误码
