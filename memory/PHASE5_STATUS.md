# Dusty Phase 5 状态记录
更新时间：2026-06-10

## 已完成项目

### 代码清理（P5-1 ~ P5-2）
- src/index.css 新增语义 token：--safe / --warn / --danger（对应 chart-2/3/4）
- 删除 App.css 死代码
- 新建 src/lib/colors.ts：合并 DiskChart 的 COLORS 和 DiskClean 的 catColor
- 新建 src/lib/utils.ts：提取 formatSize（原4处重复）
- ScanResult 9处 bg-[#xxx] → bg-safe / bg-warn / bg-danger
- Home.tsx text-white → text-primary-foreground

### 缺失状态补全（P5-3）
- ScanResult：补 loading / error 态
- Settings：补 checking 态 + saveApiKey try/catch
- Uninstall：新增 ErrorRecoveryStep（3阶段错误恢复）
- Home：底部动作栏加 flowError 提示

### 功能完善（P5-5）
- index.css 新增 --text-2xs token，4处 text-[10px] → text-2xs
- DiskClean 饼图二级下钻（点击扇形滑出明细面板）
- ai-client.ts 新增 verifyApiKey()，Settings 加验证按钮
- 20+处原生 button → shadcn Button
- 新建 src/components/Onboarding/index.tsx（三步引导，localStorage 持久化）
- App.tsx 集成 Onboarding

### 打包（P5-6）
- tauri.conf.json：productName Dusty，identifier com.dusty.cleaner
- 窗口 1000×680，最小 800×600
- 构建产物：src-tauri/target/release/bundle/nsis/Dusty_0.1.0_x64-setup.exe

---

## 待修复 Bug

### 🔴 Bug 1：底部操作栏不显示（当前最高优先级）
**现象**：点击软件卡片，console.log 确认 onClick 触发，
Home.tsx 的 selectedApp 状态也正确更新（已用 log 验证），
但底部「深度卸载」操作栏完全不出现。

**根因**：AnimatePresence 包裹的 motion.footer 动画未触发/被遮挡。

**修复方案**：
把 Home.tsx 里 AnimatePresence + motion.footer 替换为：
{ selectedApp && (
  <div style={{
    position:"fixed", bottom:0, left:0, right:0, zIndex:50,
    background:"#FFF8EE", borderTop:"1px solid #EDE0D0",
    padding:"12px 24px", display:"flex",
    alignItems:"center", justifyContent:"space-between"
  }}>
    <span style={{color:"#3D2C1E",fontSize:14}}>
      已选择：{selectedApp.name}
    </span>
    <button onClick={() => startUninstall(selectedApp)}
      style={{background:"#E8A87C",color:"white",border:"none",
        borderRadius:8,padding:"8px 20px",cursor:"pointer",fontWeight:600}}>
      深度卸载
    </button>
  </div>
)}

---

## 视觉修复记录

### 背景色问题（已解决）
- 根因：App.tsx 最外层 wrapper div 无背景色，覆盖了 body
- 修复：wrapper 加 style={{ backgroundColor:"#FAF6EF", minHeight:"100vh" }}
- body 额外加了 CSS 覆盖（#FAF6EF !important）

### CSS 变量未生效（已绕过）
- Tailwind v4 的 bg-background class 在 Tauri 环境未正确解析
- 方案：对需要背景色的 wrapper 直接用 style 或 bg-[#FAF6EF] arbitrary value

### 卡片设计（已完成）
- bg-[#FFF8EE] border border-[#EDE0D0] rounded-xl h-24 p-4
- 内容左对齐，flex flex-col justify-between
- hover:border-[#E8A87C] hover:shadow-sm transition-all
- 选中态：border-[#E8A87C] bg-[#FFF3E3]
- 网格：grid gap-3 grid-cols-4（固定4列）
- 字母角标放卡片右上角 absolute top-2 right-2

---

## 技术债

- AppList 仍用 useAppStore() 全量解构（无 selector），性能次优，后期优化
- Settings 无 API Key 验证成功后的持久化确认 UI
- Onboarding 重置按钮在 Settings 页底部（已实现）

---

## 环境信息

- 工作目录：E:\ClaudeWork\dusty
- 打包输出：src-tauri\target\release\bundle\nsis\
- DeepSeek API 余额：注意监控（曾出现 402）
- npm cache：E:/ClaudeWork/npm-cache（.npmrc 已配置）
- Tauri dev 是长驻进程，启动后不等待结束，直接返回
