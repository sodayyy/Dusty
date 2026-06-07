# Dusty Phase 0 · 第一天执行命令序列
# 在 PowerShell 中按顺序执行

# ============================================================
# 第一步：建项目目录，写入文档
# ============================================================

# 进入工作目录
cd E:\ClaudeWork

# 建项目文件夹
mkdir dusty
cd dusty

# 把 AGENTS_APPEND.md 内容追加到上级 AGENTS.md（手动操作）
# → 打开 E:\ClaudeWork\AGENTS.md，把 AGENTS_APPEND.md 的内容粘贴到末尾保存
# → 把 DUSTY_SPEC.md 复制到 E:\ClaudeWork\dusty\DUSTY_SPEC.md

# ============================================================
# 第二步：git 初始化
# ============================================================

git init
git config user.name "yzj"
git config user.email "你的邮箱"    # 换成你自己的

# 创建 .gitignore
@"
node_modules/
target/
dist/
.env
*.env.local
src-tauri/target/
"@ | Out-File -Encoding utf8 .gitignore

# 先提交文档基础
git add .gitignore DUSTY_SPEC.md
git commit -m "初始化：添加产品设计文档和gitignore"

# ============================================================
# 第三步：创建 Tauri + React 项目
# ============================================================

# 注意：npm create 会在当前目录下新建子目录，选项选好
# 在 E:\ClaudeWork\dusty\ 目录下执行：
npm create tauri-app@latest . --cache E:/ClaudeWork/npm-cache
# 交互选项：
#   Package name: dusty
#   Choose which language to use for your frontend: TypeScript / JavaScript → TypeScript
#   Choose your package manager: npm
#   Choose your UI template: React
#   Choose your UI flavor: TypeScript

# ============================================================
# 第四步：安装前端依赖
# ============================================================

# 创建 .npmrc（避免缓存权限问题）
@"
cache=E:/ClaudeWork/npm-cache
"@ | Out-File -Encoding utf8 .npmrc

# 安装基础依赖
npm install

# 安装项目依赖
npm install framer-motion recharts zustand
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react

# 安装 shadcn/ui（按提示初始化）
npx shadcn@latest init
# 选项：
#   Which style: Default
#   Which color: Stone（最接近米黄暖色）
#   Use CSS variables: Yes

# ============================================================
# 第五步：安装 Rust 依赖（在 src-tauri 目录操作）
# ============================================================

cd src-tauri

# 检查 Cargo.toml，确认 tauri 版本是 v2
# 添加需要的 crate（手动编辑 Cargo.toml 或用 cargo add）

cargo add serde --features derive
cargo add serde_json
cargo add winreg           # Windows 注册表读写
cargo add walkdir          # 递归遍历目录

cd ..

# ============================================================
# 第六步：配置 Tauri 权限（tauri.conf.json）
# ============================================================

# 打开 src-tauri/tauri.conf.json
# 在 "bundle" 里确认 identifier 是 "com.dusty.app"
# 在 "app" → "security" → "csp" 确保允许 localhost

# capabilities 需要开启（src-tauri/capabilities/default.json）：
# - fs:read-all
# - fs:write-all  
# - shell:execute
# - path:default

# ============================================================
# 第七步：验证能跑起来
# ============================================================

# 回到项目根目录
cd E:\ClaudeWork\dusty

# 开发模式启动（第一次会编译 Rust，需要几分钟）
npm run tauri dev

# 看到 Tauri 窗口弹出来 = 环境 OK

# ============================================================
# 第八步：提交初始项目结构
# ============================================================

git add .
git commit -m "Phase 0：Tauri + React 项目初始化完成"

# ============================================================
# 完成！接下来让 Codex 开始 Phase 1
# ============================================================

# Phase 1 第一个任务：实现 app_list.rs
# 给 Codex 的指令见下方

