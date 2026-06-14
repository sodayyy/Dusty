use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct UninstallResult {
    pub success: bool,
    pub exit_code: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

#[tauri::command]
pub fn run_uninstaller(uninstall_string: &str, silent: bool) -> Result<UninstallResult, String> {
    let s = uninstall_string.trim();
    if s.is_empty() {
        return Err("Uninstall string is empty".into());
    }

    if s.to_lowercase().contains("msiexec") {
        run_msi(s, silent)
    } else {
        run_generic(s, silent)
    }
}

fn run_msi(s: &str, _silent: bool) -> Result<UninstallResult, String> {
    let mut cmd = Command::new("msiexec.exe");
    // Normalize /I to /X for uninstall
    let s = s.replace("/I{", "/X{").replace("/i{", "/X{");
    for part in s.split_whitespace() {
        if part.starts_with("/X") || part.starts_with("/x") {
            cmd.arg(part);
        }
    }
    let output = cmd.output().map_err(|e| format!("msiexec: {}", e))?;
    Ok(UninstallResult {
        success: output.status.success(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

fn run_generic(s: &str, _silent: bool) -> Result<UninstallResult, String> {
    let (program, args) = split_program_args(s);

    let mut cmd = if args.trim().is_empty() {
        Command::new(&program)
    } else {
        let mut c = Command::new(&program);
        for arg in args.split_whitespace() {
            c.arg(arg);
        }
        c
    };

    match cmd.output() {
        Ok(output) => Ok(UninstallResult {
            success: output.status.success(),
            exit_code: output.status.code(),
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        }),
        Err(e) => Ok(UninstallResult {
            success: false,
            exit_code: None,
            stdout: String::new(),
            stderr: format!("{}", e),
        }),
    }
}

/// 验证软件是否已被真正卸载
/// 返回 true = 卸载成功（目录和注册表都已清理）
/// 返回 false = 卸载未完成（目录或注册表仍然存在）
#[tauri::command]
pub fn verify_uninstalled(
    install_location: &str,
    software_name: &str,
) -> Result<bool, String> {
    use winreg::enums::*;
    use winreg::RegKey;

    // 检查安装目录
    let dir_gone = if install_location.is_empty() {
        true
    } else {
        !std::path::Path::new(install_location).exists()
    };

    // 检查注册表 Uninstall 项
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let name_lower = software_name.to_lowercase();

    let uninstall_paths: [(&RegKey, &str); 3] = [
        (&hklm, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hklm, r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"),
        (&hkcu, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall"),
    ];

    let mut reg_gone = true;
    'outer: for (predef, base_path) in &uninstall_paths {
        let key = match predef.open_subkey_with_flags(base_path, KEY_READ) {
            Ok(k) => k,
            Err(_) => continue,
        };
        for subkey_result in key.enum_keys() {
            if let Ok(subkey_name) = subkey_result {
                if subkey_name.to_lowercase().contains(&name_lower) {
                    reg_gone = false;
                    break 'outer;
                }
                let full = format!("{}\\{}", base_path, subkey_name);
                if let Ok(sk) = predef.open_subkey_with_flags(&full, KEY_READ) {
                    if let Ok(display_name) = sk.get_value::<String, _>("DisplayName") {
                        if display_name.to_lowercase().contains(&name_lower) {
                            reg_gone = false;
                            break 'outer;
                        }
                    }
                }
            }
        }
    }

    Ok(dir_gone && reg_gone)
}

fn split_program_args(s: &str) -> (String, String) {
    // 1. 有引号：按引号切分
    if s.starts_with('"') {
        if let Some(end) = s[1..].find('"') {
            let prog = s[1..end + 1].to_string();
            let args = s[end + 2..].trim_start().to_string();
            return (prog, args);
        }
    }

    // 2. 整个字符串就是路径（无参数，路径含空格）
    if std::path::Path::new(s).exists() {
        return (s.to_string(), String::new());
    }

    // 3. 从最右空格往左逐个尝试前缀，第一个存在的文件就是程序路径
    let mut last_space = s.len();
    while let Some(pos) = s[..last_space].rfind(' ') {
        let candidate = &s[..pos];
        if std::path::Path::new(candidate).exists() {
            let args = s[pos + 1..].trim_start().to_string();
            return (candidate.to_string(), args);
        }
        last_space = pos;
    }

    // 4. 兜底：按第一个空格切分（让 OS 报"找不到文件"而不是静默失败）
    if let Some(space) = s.find(' ') {
        return (s[..space].to_string(), s[space + 1..].to_string());
    }

    (s.to_string(), String::new())
}
