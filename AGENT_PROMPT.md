# Agent 提示词（完整版）

把下面整段发给一台 Windows 电脑上的编码 agent，让它自动完成安装与主题应用。

---

## 提示词正文

我在一台 Windows 电脑上，目标：安装 MarkText 并给它打上 Claude 风格的编辑器主题
（米白 #faf9f5 底、赤陶橙 #d97757 强调色的浅色 "Claude"，以及暖炭 #262624 底的
深色 "Claude Dark"，配色修改自 github.com/blaxisomu/typora_claude）。

请克隆 github.com/DarkModest/marktext_claude 并严格按以下步骤执行：

1. 环境检查：`node -v`（需 18+，没有就先装 Node LTS）；
   检查 MarkText 是否已安装（默认路径 `%LOCALAPPDATA%\Programs\marktext\resources\app.asar`，
   非默认位置后续每步传路径参数或设 `MARKTEXT_ASAR` 环境变量）。
   未安装就从 https://github.com/marktext/marktext/releases 装 0.23.x，装完至少启动一次再关闭。

2. 若 MarkText 正在运行：先尝试优雅关闭（Git Bash 用 `taskkill //IM marktext.exe`，
   cmd 用 `taskkill /IM marktext.exe`），等几秒。若主进程仍在（可能有未保存文档弹窗），
   停下来让我保存文档后手动关闭——绝不使用 `/F` 强杀。

3. `cd marktext_claude && npm install`

4. 依次执行并检查输出：
   - `node extract.mjs`（解包 app.asar → mt-extracted/）
   - `node build-claude-themes.mjs`（注入两个主题并打包三款 Anthropic 字体；幂等，重跑会显示 already patched）
   - `node repack-verify.mjs`（必须看到 20 项 PASS 和 ALL VERIFICATION PASSED）
   - `node install.mjs`（首次自动备份为 app.asar.bak-claude；要求 MarkText 已关闭）

5. 验证：让我启动 MarkText，检查 主题 菜单里有 "Claude / Claude 浅色" 和
   "Claude Dark / Claude 深色"，选择后编辑器底色变为米白或暖炭；
   同时确认字体：正文衬线、代码等宽、侧栏无衬线，中文正常显示。
   把回滚方法告诉我：把 `app.asar.bak-claude` 复制回 `app.asar` 即可。

注意事项（重要，都是实测踩过的坑）：
- MarkText 0.23.x 没有自定义主题接口，主题硬编码在渲染进程 bundle 里，只能给
  app.asar 打补丁；npm 上的 typora→marktext 转换工具的 install-editor 命令只兼容
  0.17.x，对 0.23 会报 ENOENT，别用它装编辑器主题。
- 若未来 MarkText 版本导致 build-claude-themes.mjs 报"anchor missing"：
  在 mt-extracted/out/renderer/assets/ 下找含 `graphite.theme.css?inline`
  的 .js 文件，在 out/main/index.js 里搜 railscastsThemes、graphite、
  themeBackgroundColors、LIGHT_THEMES、`{ name: "light" }`，
  按新结构调整脚本里的锚点字符串后重跑。
- 重打包的 unpack 规则必须用 basename 通配 `*.{node,exe}`（asar 在 Windows
  上拿绝对反斜杠路径做 matchBase 匹配，斜杠式 glob 一条都匹配不上），
  否则 ced/keytar/native-keymap 的 .node 和 rg.exe 会被打进包里导致启动崩溃。
- 如果目标电脑装过本主题的旧版本：也重新跑完整四步，不要手工跳过任何一步。
  新版 extract.mjs 会自动改用 app.asar.bak-claude 原始备份；build 脚本遇到旧补丁树会
  报错拒绝；repack-verify 会校验主题版本（rev 2），旧版本无法通过。
- 如果某步失败，先读脚本输出再动手；不要跳过 repack-verify 直接安装。

---

## 说明

脚本已在本机用"干净原始包 → 提取 → 补丁 → 打包校验 → 安装 → 幂等重跑"完整流程
验证通过。配色修改自 [blaxisomu/typora_claude](https://github.com/blaxisomu/typora_claude)；
主题 CSS 按 MarkText 内置 graphite 主题的变量结构生成，Claude 配色映射硬编码在
`build-claude-themes.mjs` 中。