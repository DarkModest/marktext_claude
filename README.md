# marktext_claude

Claude 风格的 MarkText 主题（浅色 / 深色），米白 `#faf9f5` 底、赤陶橙 `#d97757` 强调色。

**修改自 [blaxisomu/typora_claude](https://github.com/blaxisomu/typora_claude)。** 配色、字体风格与整体观感均来自该仓库的 Typora 主题；本项目将其适配到 MarkText 0.23.x，并对照原版修正了移植中的若干细节（正文实色、标题/加粗/链接、行内代码、代码高亮色板、勾选框等）。

- 浅色 `Claude` / 深色 `Claude Dark` 两套，含中文菜单名（Claude 浅色 / Claude 深色）
- 适配 MarkText **0.23.x**（Windows 实测；0.17.x 不适用）
- MarkText 0.23 没有自定义主题接口，主题硬编码在 `app.asar` 内；本项目以补丁方式注入，自带备份与回滚

## 手动安装

前提：Node.js 18+，MarkText 0.23.x 已安装并已关闭（先保存文档）。

```powershell
git clone https://github.com/DarkModest/marktext_claude
cd marktext_claude
npm install

node extract.mjs             # 解包 app.asar -> mt-extracted/
node build-claude-themes.mjs # 注入 claude / claude-dark 两个主题（幂等，可重复跑）
node repack-verify.mjs       # 重新打包并全量校验，需看到 ALL VERIFICATION PASSED
node install.mjs             # 备份原包并安装
```

非默认安装位置：给脚本传 `app.asar` 路径参数，或设置 `MARKTEXT_ASAR` 环境变量。

安装完成后启动 MarkText，在 **主题** 菜单中选择 **Claude**（浅色）或 **Claude Dark**（深色）；
或使用 偏好设置 → 主题。

回滚：

```powershell
Copy-Item "$env:LOCALAPPDATA\Programs\marktext\resources\app.asar.bak-claude" `
          "$env:LOCALAPPDATA\Programs\marktext\resources\app.asar" -Force
```

导出主题（HTML/PDF，可选）：用 [irrit-us/theme-convertor-typora-marktext](https://github.com/irrit-us/theme-convertor-typora-marktext)
对原版 `claude.css` / `claude-dark.css` 执行 `convert` + `install-export` 即可，详见该仓库说明。

## Agent 提示词

把下面整段发给任意编码 agent（需带上本仓库）：

```text
我在一台 Windows 电脑上，目标：安装 MarkText 并给它打上 Claude 风格的编辑器主题
（米白 #faf9f5 底、赤陶橙 #d97757 强调色的浅色 "Claude"，以及暖炭 #262624 底的
深色 "Claude Dark"，配色修改自 github.com/blaxisomu/typora_claude）。

请克隆 github.com/DarkModest/marktext_claude，按 README 的"手动安装"执行：
1. 检查 node -v（需 18+）；未装 MarkText 则从
   https://github.com/marktext/marktext/releases 装 0.23.x，装完启动一次再关闭。
2. 若 MarkText 正在运行：先优雅关闭（taskkill //IM marktext.exe），等几秒；
   若主进程仍在（可能有未保存文档弹窗），停下来让我保存文档后关闭——绝不 /F 强杀。
3. cd marktext_claude && npm install
4. 依次执行 node extract.mjs、node build-claude-themes.mjs、node repack-verify.mjs
   （必须看到 ALL VERIFICATION PASSED）、node install.mjs。
5. 让我启动 MarkText，确认主题菜单里有 "Claude 浅色 / Claude 深色"，选择后底色变米白/暖炭；
   并告诉我回滚方法（app.asar.bak-claude 复制回去）。

注意：某步失败先读脚本输出再动手；不要跳过 repack-verify 直接安装。
```

完整版（含版本漂移时的锚点调整指引）见 [AGENT_PROMPT.md](AGENT_PROMPT.md)。

## 已知限制

- 仅适配 MarkText 0.23.x 的内部结构；版本升级导致注入失败时，脚本会报出找不到的锚点，按报错在渲染 bundle / main bundle 中定位调整即可
- 不改字体（沿用 MarkText 偏好设置里的编辑器字体）；如需原版字体效果需自行安装并设置
- 原仓库未声明开源协议；本项目仅作风格改编与致谢，代码部分可自由参考使用