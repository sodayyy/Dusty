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

fn run_msi(s: &str, silent: bool) -> Result<UninstallResult, String> {
    let mut cmd = Command::new("msiexec.exe");
    // Normalize /I to /X for uninstall
    let s = s.replace("/I{", "/X{").replace("/i{", "/X{");
    for part in s.split_whitespace() {
        if part.starts_with("/X") || part.starts_with("/x") {
            cmd.arg(part);
        }
    }
    if silent {
        cmd.arg("/quiet").arg("/norestart");
    }
    let output = cmd.output().map_err(|e| format!("msiexec: {}", e))?;
    Ok(UninstallResult {
        success: output.status.success(),
        exit_code: output.status.code(),
        stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
        stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
    })
}

fn run_generic(s: &str, silent: bool) -> Result<UninstallResult, String> {
    let (program, mut args) = split_program_args(s);
    if silent {
        // Append silent flag if not already present
        let already_silent = args.to_lowercase().contains("/s")
            || args.to_lowercase().contains("/silent")
            || args.to_lowercase().contains("/quiet")
            || args.to_lowercase().contains("/verysilent");
        if !already_silent {
            args = format!("{} /S", args.trim());
        }
    }

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

fn split_program_args(s: &str) -> (String, String) {
    if s.starts_with('"') {
        // Quoted path: "C:\Program Files\Foo\uninst.exe" /args
        if let Some(end) = s[1..].find('"') {
            let prog = s[1..end + 1].to_string();
            let args = s[end + 2..].to_string();
            return (prog, args);
        }
    }
    // Unquoted: C:\path\to\uninst.exe /args
    if let Some(space) = s.find(' ') {
        let prog = s[..space].to_string();
        let args = s[space + 1..].to_string();
        return (prog, args);
    }
    (s.to_string(), String::new())
}
