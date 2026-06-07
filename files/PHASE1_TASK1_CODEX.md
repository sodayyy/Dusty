# Phase 1 · Task 1：软件列表扫描
# 把这段话直接发给 Codex，作为第一个开发任务

---

请实现 `src-tauri/src/app_list.rs`，功能：读取 Windows 注册表获取已安装软件列表。

**要求：**

1. 读取以下两个注册表路径（32位和64位都要）：
   - `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`
   - `HKEY_LOCAL_MACHINE\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall`
   - `HKEY_CURRENT_USER\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall`

2. 每个软件提取以下字段：
   ```rust
   pub struct AppInfo {
       pub name: String,           // DisplayName
       pub publisher: String,      // Publisher（没有就空字符串）
       pub version: String,        // DisplayVersion（没有就空字符串）
       pub install_date: String,   // InstallDate（没有就空字符串）
       pub install_location: String, // InstallLocation（没有就空字符串）
       pub uninstall_string: String, // UninstallString（没有就空字符串）
       pub size_kb: u64,           // EstimatedSize（没有就0）
   }
   ```

3. 过滤规则：
   - 跳过没有 `DisplayName` 的条目
   - 跳过 `SystemComponent = 1` 的条目（系统组件）
   - 跳过 name 为空字符串的条目
   - 去重（同名软件只保留一条）

4. 返回 `Vec<AppInfo>`，按 name 字母排序

5. 暴露为 Tauri Command：
   ```rust
   #[tauri::command]
   pub fn get_installed_apps() -> Result<Vec<AppInfo>, String>
   ```

6. 在 `main.rs` 中注册这个 command

7. 在 `src/lib/tauri-commands.ts` 中添加对应的前端调用函数：
   ```typescript
   export async function getInstalledApps(): Promise<AppInfo[]>
   ```

8. 用 `winreg` crate（已在 Cargo.toml 中）

**完成后：**
- 在 `src/pages/Home.tsx` 里临时调用 `getInstalledApps()`，console.log 输出结果验证
- 能看到真实软件列表数据 = 任务完成
- git commit -m "Phase 1：实现注册表读取软件列表"

**遇到以下问题停下来告诉我，我去问 Claude：**
- winreg 读取权限被拒绝
- Tauri command 注册报错
- 类型序列化问题（serde 相关报错）

