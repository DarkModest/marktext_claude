// Step 2: patch extracted asar files with Claude (light/dark) themes for MarkText 0.23.x.
// Idempotent: re-running on patched files exits without changes.
// Palette from blaxisomu/typora_claude (claude.css / claude-dark.css).
import fs from 'node:fs';
import path from 'node:path';

// ---- locate renderer theme bundle (hash in filename varies per build) ----
const assetsDir = 'mt-extracted/out/renderer/assets';
const MAIN = 'mt-extracted/out/main/index.js';
let REN = null;
for (const f of fs.readdirSync(assetsDir)) {
  if (!f.endsWith('.js')) continue;
  const p = assetsDir + '/' + f;
  const s = fs.readFileSync(p, 'utf8');
  if (s.includes('graphite.theme.css?inline') && s.includes('var addThemeStyle')) { REN = p; break; }
}
if (!REN) {
  console.error('renderer theme bundle not found under ' + assetsDir);
  console.error('MarkText version may differ; look for the asset containing "graphite.theme.css?inline".');
  process.exit(1);
}
console.log('renderer bundle:', REN);

// ---------- bundle Claude web fonts into the asar (renderer CSP allows font-src 'self') ----------
const FONT_FILES = ['AnthropicSerif-WebText.ttf', 'AnthropicSans-WebText.ttf', 'AnthropicMono-Variable.ttf'];
{
  const srcDir = 'fonts';
  const destDir = 'mt-extracted/out/renderer/assets/claude-fonts';
  if (FONT_FILES.every((f) => fs.existsSync(path.join(srcDir, f)))) {
    fs.mkdirSync(destDir, { recursive: true });
    for (const f of FONT_FILES) fs.copyFileSync(path.join(srcDir, f), path.join(destDir, f));
    console.log('fonts bundled:', FONT_FILES.length, '->', destDir);
  } else {
    console.warn('WARNING: fonts/ is incomplete — theme will fall back to system fonts.');
  }
}

const THEME_REV = 3;
let ren = fs.readFileSync(REN, 'utf8');
if (ren.includes('claude_theme_default$1')) {
  const m = ren.match(/var claudeThemeRev = (\d+);/);
  const rev = m ? Number(m[1]) : 1;
  if (rev >= THEME_REV) {
    console.log(`already patched (rev ${rev}), nothing to do.`);
    process.exit(0);
  }
  console.error(`input tree contains an OLD claude patch (rev ${rev}) — refusing to repack a stale theme.`);
  console.error('Re-extract from the STOCK asar first: node extract.mjs');
  console.error('(extract.mjs automatically uses app.asar.bak-claude when the target asar is patched).');
  console.error('If no backup exists, reinstall MarkText to restore a stock asar, then re-run.');
  process.exit(1);
}

// ---------- theme CSS builders ----------
function varsBlock(v) {
  return `:root {
  --themeColor: ${v.accent};
  --themeColor90: ${v.accentA(0.9)};
  --themeColor80: ${v.accentA(0.8)};
  --themeColor70: ${v.accentA(0.7)};
  --themeColor60: ${v.accentA(0.6)};
  --themeColor50: ${v.accentA(0.5)};
  --themeColor40: ${v.accentA(0.4)};
  --themeColor30: ${v.accentA(0.3)};
  --themeColor20: ${v.accentA(0.2)};
  --themeColor10: ${v.accentA(0.1)};

  --highlightColor: ${v.highlight};
  --selectionColor: ${v.selection};
  --editorColor: ${v.ink(1)};
  --editorColor80: ${v.ink(0.8)};
  --editorColor60: ${v.ink(0.6)};
  --editorColor50: ${v.ink(0.5)};
  --editorColor40: ${v.ink(0.4)};
  --editorColor30: ${v.ink30};
  --editorColor10: ${v.ink(0.1)};
  --editorColor04: ${v.ink(0.04)};
  --editorBgColor: ${v.bg};
  --deleteColor: ${v.delete};
  --iconColor: ${v.icon};
  --codeBgColor: ${v.codeBg};
  --codeBlockBgColor: ${v.codeBlockBg};
  --codeBlockColor: ${v.codeBlockFg};
  --footnoteBgColor: ${v.footnoteBg};
  --inputBgColor: ${v.inputBg};
  --focusColor: var(--themeColor);

  --buttonFontColor: var(--editorColor);
  --buttonBgColor: ${v.btnBg};
  --buttonBorder: 1px solid ${v.btnBorder};
  --buttonShadow: none;
  --buttonFontColorHover: var(--buttonFontColor);
  --buttonBgColorHover: ${v.btnBgHover};
  --buttonBorderHover: var(--buttonBorder);
  --buttonFontColorActive: var(--buttonFontColor);
  --buttonBgColorActive: ${v.btnBgActive};
  --buttonBorderActive: var(--buttonBorder);
  --buttonFocusBorder: 1px solid var(--themeColor);

  --buttonPrimaryFontColor: ${v.primaryFg};
  --buttonPrimaryBgColor: var(--themeColor);
  --buttonPrimaryBorder: none;
  --buttonPrimaryShadow: 0 0 8px 0 ${v.shadowSoft};
  --buttonPrimaryFontColorHover: var(--buttonPrimaryFontColor);
  --buttonPrimaryBgColorHover: var(--buttonPrimaryBgColor);
  --buttonPrimaryBorderHover: var(--buttonPrimaryBorder);
  --buttonPrimaryFontColorActive: var(--buttonPrimaryFontColor);
  --buttonPrimaryBgColorActive: var(--buttonPrimaryBgColor);
  --buttonPrimaryBorderActive: var(--buttonPrimaryBorder);
  --buttonPrimaryFocusBorder: none;
  --buttonPrimaryFocusShadow: inset 0 0 0 1px ${v.shadowInset}, 0 0 0 1px var(--themeColor);
  --tableBorderColor: ${v.tableBorder};

  --headingColor: ${v.ink(1)};
  --h1Color: ${v.h1};
  --h2Color: ${v.h2};
  --h3Color: ${v.h3};
  --h4Color: ${v.h4};
  --h5Color: ${v.h5};
  --h6Color: ${v.h6};
  --blockquoteTextColor: ${v.quoteText};
  --blockquoteBorderColor: ${v.quoteBorder};
  --hrColor: ${v.hr};
  --linkColor: ${v.link};
  --strongColor: ${v.strongColor};
  --emColor: ${v.em};
  --listMarkerColor: ${v.listMarker};

  --sideBarColor: ${v.sideInk(1)};
  --sideBarIconColor: ${v.icon};
  --sideBarTitleColor: ${v.sideInk(1)};
  --sideBarTextColor: ${v.sideInk(1)};
  --sideBarBgColor: ${v.sideBg};
  --sideBarItemHoverBgColor: ${v.sideHover};
  --itemBgColor: ${v.itemBg};

  --floatFontColor: ${v.ink(0.7)};
  --floatBgColor: ${v.floatBg};
  --floatHoverColor: ${v.floatHover};
  --floatBorderColor: ${v.floatBorder};
  --maskColor: ${v.mask};
  --editorAreaWidth: 750px;

  --theme-color: var(--themeColor);
  --highlight-color: var(--highlightColor);
  --selection-color: var(--selectionColor);
  --editor-color: var(--editorColor);
  --editor-color-80: var(--editorColor80);
  --editor-color-50: var(--editorColor50);
  --editor-color-30: var(--editorColor30);
  --editor-color-10: var(--editorColor10);
  --editor-color-04: var(--editorColor04);
  --editor-bg-color: var(--editorBgColor);
  --editor-area-width: var(--editorAreaWidth);
  --delete-color: var(--deleteColor);
  --icon-color: var(--iconColor);
  --code-block-bg-color: var(--codeBlockBgColor);
  --code-block-color: var(--codeBlockColor);
  --table-border-color: var(--tableBorderColor);
  --input-bg-color: var(--inputBgColor);
  --button-font-color: var(--buttonFontColor);
  --button-bg-color: var(--buttonBgColor);
  --button-border: var(--buttonBorder);
  --button-bg-color-hover: var(--buttonBgColorHover);
  --button-border-hover: var(--buttonBorderHover);
  --button-bg-color-active: var(--buttonBgColorActive);
  --button-border-active: var(--buttonBorderActive);
  --button-border-focus: var(--button-border);
  --float-bg-color: var(--floatBgColor);
  --float-hover-color: var(--floatHoverColor);
  --float-border-color: var(--floatBorderColor);
  --float-shadow: ${v.floatShadow};
  --link-color: var(--linkColor);
  --h1-color: var(--h1Color);
  --h2-color: var(--h2Color);
  --h3-color: var(--h3Color);
  --h4-color: var(--h4Color);
  --h5-color: var(--h5Color);
  --h6-color: var(--h6Color);
  --blockquote-text-color: var(--blockquoteTextColor);
  --blockquote-border-color: var(--blockquoteBorderColor);
  --strong-color: var(--strongColor);
  --em-color: var(--emColor);
  --list-marker-color: var(--listMarkerColor);
  --hr-color: var(--hrColor);
}

/* ---- Claude typography: bundled web fonts + CJK/system fallbacks ---- */
@font-face {
  font-family: "Anthropic Serif Web Text";
  src: url("./assets/claude-fonts/AnthropicSerif-WebText.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Anthropic Sans Web Text";
  src: url("./assets/claude-fonts/AnthropicSans-WebText.ttf") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
@font-face {
  font-family: "Anthropic Mono Variable";
  src: url("./assets/claude-fonts/AnthropicMono-Variable.ttf") format("truetype");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

/* body text: serif (claude.ai content font); CJK -> Noto Serif SC / Songti / SimSun */
.mu-editor,
.mu-container {
  font-family: "Anthropic Serif Web Text", "Tiempos Text", "Source Serif 4", Georgia, "Times New Roman",
    "Noto Serif SC", "Source Han Serif SC", "Songti SC", SimSun, serif !important;
}
/* code: Anthropic Mono; CJK -> Source Han Sans / Noto Sans SC */
.mu-code-block,
pre.mu-code-block,
code.mu-code,
code.mu-inline-rule {
  font-family: "Anthropic Mono Variable", "Anthropic Mono", "SF Mono", "Cascadia Code", "JetBrains Mono",
    Consolas, "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", ui-monospace, monospace !important;
}
/* source mode (CodeMirror): #ag-common-style is injected after the theme, so !important is required */
.CodeMirror {
  font-family: "Anthropic Mono Variable", "Anthropic Mono", "SF Mono", "Cascadia Code", "JetBrains Mono",
    Consolas, "Source Han Sans SC", "Noto Sans SC", "Microsoft YaHei", ui-monospace, monospace !important;
}
/* UI chrome: Anthropic Sans; CJK -> Noto Sans SC / PingFang / YaHei */
html,
body {
  font-family: "Anthropic Sans Web Text", "Styrene B", "Segoe UI", system-ui, -apple-system,
    "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif !important;
}

.editor-tabs {
  background: ${v.tabsBg} !important;
  box-shadow: none !important;
}
.editor-tabs:after {
  position: absolute;
  content: '';
  border-bottom: 1px solid ${v.tabBorder};
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1;
}
.editor-tabs ul.tabs-container:after {
  position: absolute;
  content: '';
  border-bottom: 1px solid ${v.tabBorder};
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
}
.title-bar-editor-bg.tabs-visible {
  background: ${v.tabsBg} !important;
}

.tabs-container > li {
  background: none !important;
}
.tabs-container > li.active {
  border: 1px solid ${v.tabBorder};
  border-top: none;
  border-bottom: none;
  background: ${v.floatBg} !important;
  background: var(--floatBgColor) !important;
}
.tabs-container > li.active:after {
  top: 0 !important;
  bottom: auto !important;
  background: ${v.accent} !important;
  background: var(--themeColor) !important;
}


.mu-container li.mu-list-item {
  color: ${v.ink(0.7)};
  color: var(--editorColor);
}

li.mu-task-list-item {
  list-style-type: none;
  position: relative;
}
li.mu-task-list-item > input[type='checkbox'],
li.mu-task-list-item > span.mu-task-list-checkbox {
  position: absolute;
  cursor: pointer;
  width: 16px;
  height: 16px;
  top: calc(var(--mu-line-height, 1.6) * 0.5 * var(--mu-font-size, 16px) - 8px);
  transform: rotate(-90deg);
  margin: 0;
  inset-inline-start: -24px;
  transform-origin: center;
  transition: all 0.2s ease;
}
li.mu-task-list-item > input.mu-checkbox-checked,
li.mu-task-list-item > span.mu-checkbox-checked {
  transform: rotate(0);
}
li.mu-task-list-item > input[type='checkbox']::before,
li.mu-task-list-item > span.mu-task-list-checkbox::before {
  content: '';
  width: 16px;
  height: 16px;
  box-sizing: border-box;
  display: inline-block;
  border: 1px solid ${v.checkBorder};
  border-radius: 2px;
  background-color: ${v.checkBg};
  position: absolute;
  top: 0;
  left: 0;
  transition: all 0.2s ease;
}
li.mu-task-list-item > input.mu-checkbox-checked::before,
li.mu-task-list-item > span.mu-checkbox-checked::before {
  border-color: ${v.checkBorder};
  background-color: ${v.checkCheckedBg};
}
li.mu-task-list-item > input::after,
li.mu-task-list-item > span.mu-task-list-checkbox::after {
  content: '';
  transform: rotate(-45deg) scale(0);
  width: 9px;
  height: 5px;
  border: 2px solid ${v.checkMark};
  border-top: none;
  border-right: none;
  position: absolute;
  display: inline-block;
  top: 1px;
  left: 5px;
  transition: all 0.2s ease;
}
li.mu-task-list-item > input.mu-checkbox-checked::after,
li.mu-task-list-item > span.mu-checkbox-checked::after {
  transform: rotate(-45deg) scale(1);
}

.mu-thematic-break:not(.mu-active)::before {
  content: '';
  position: absolute;
  width: 100%;
  display: block;
  left: 50%;
  top: 50%;
  height: 2px;
  box-sizing: border-box;
  border: none;
  border-bottom: 2px dashed ${v.ink(0.5)};
  border-bottom: 2px dashed var(--editorColor50);
  transform: translateX(-50%) translateY(-50%);
}

/* links: ink color + underline (typora_claude: a = font-color, hover = #D97757) */
a.mu-inline-rule,
span.mu-inline-rule.mu-link {
  text-decoration: underline;
  text-decoration-color: ${v.linkUnderline};
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}
a.mu-inline-rule:hover,
span.mu-inline-rule.mu-link:hover {
  color: var(--themeColor);
}

/* inline code (typora_claude: #8a2424 / #f4a9a9 on faint bg with hairline border) */
:not(pre):not(.mu-code-block) > code.mu-code {
  color: ${v.inlineCodeFg};
  border: 1px solid ${v.inlineCodeBorder};
  border-radius: 4px;
  padding: 0.1em 0.3em;
}
.mu-code-block code.mu-code {
  color: inherit;
  border: none;
  background: none;
  padding: 0;
}
`;
}

function prismBlock(p) {
  return `/*
 * Prism.js Claude Theme (${p.name})
 * Palette from blaxisomu/typora_claude
 */

code[class*='language-'],
pre.ag-paragraph {
  color: ${p.base};
  text-align: left;
  white-space: pre;
  word-spacing: normal;
  word-break: normal;
  word-wrap: normal;
  -moz-tab-size: 4;
  -o-tab-size: 4;
  tab-size: 4;
  hyphens: none;
  overflow: visible;
}

pre.ag-paragraph {
  padding: 1em;
  margin: 1em 0;
  border-radius: 0.3em;
}

:not(pre) > code[class*='language-'],
pre.ag-paragraph {
  background: ${p.preBg};
}

:not(pre) > code[class*='language-'] {
  padding: 0.1em;
  border-radius: 0.3em;
  white-space: normal;
}

.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: ${p.comment};
  font-style: italic;
}

.token.punctuation {
  color: ${p.punct};
}

.namespace {
  opacity: 0.7;
}

.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: ${p.tag};
}

.token.boolean,
.token.number {
  color: ${p.number};
}

.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: ${p.string};
}

.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: ${p.operator};
}

.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: ${p.func};
}

.token.keyword {
  color: ${p.keyword};
}

.token.regex,
.token.important,
.token.variable {
  color: ${p.regex};
}

.token.important,
.token.bold {
  font-weight: bold;
}

.token.italic {
  font-style: italic;
}

.token.entity {
  cursor: help;
}
`;
}

// Claude light: bg #faf9f5, font #141413 (solid), accent #D97757 — matches typora_claude vars
const light = {
  accent: '#d97757',
  accentA: (a) => `rgba(217, 119, 87, ${a})`,
  highlight: 'rgba(217, 119, 87, 0.35)',
  selection: 'rgba(217, 119, 87, 0.5)',
  ink: (a) => `rgba(20, 20, 19, ${a})`,
  ink30: 'rgba(122, 120, 113, 0.8)',
  bg: '#faf9f5',
  delete: '#ff6969',
  icon: 'rgba(31, 30, 29, 0.75)',
  codeBg: 'rgba(61, 61, 58, 0.05)',
  codeBlockBg: 'rgba(255, 255, 255, 0.5)',
  codeBlockFg: '#14181f',
  footnoteBg: 'rgba(31, 30, 29, 0.03)',
  inputBg: 'rgba(31, 30, 29, 0.06)',
  btnBg: '#ffffff',
  btnBorder: '#dcd9cd',
  btnBgHover: 'linear-gradient(#f0eee6, #e8e6dc)',
  btnBgActive: '#f0eee6',
  primaryFg: '#ffffff',
  shadowSoft: 'rgba(0, 0, 0, 0.1)',
  shadowInset: 'rgba(140, 80, 55, 0.5)',
  tableBorder: 'rgba(31, 30, 29, 0.3)',
  h1: '#141413', h2: '#141413', h3: '#141413', h4: '#141413', h5: '#141413', h6: '#141413',
  quoteText: '#3d3d3a',
  quoteBorder: 'rgba(31, 30, 29, 0.1)',
  hr: 'rgba(31, 30, 29, 0.3)',
  link: '#141413',
  strongColor: '#141413',
  listMarker: '#141413',
  linkUnderline: 'rgba(20, 20, 19, 0.35)',
  em: '#141413',
  inlineCodeFg: '#8a2424',
  inlineCodeBorder: '#1f1e1d26',
  sideInk: (a) => `rgba(61, 61, 58, ${a})`,
  sideBg: '#faf9f5',
  sideHover: 'rgba(255, 255, 255, 0.04)',
  itemBg: '#f0eee6',
  floatBg: '#f8f8f3',
  floatHover: 'rgba(20, 20, 19, 0.04)',
  floatBorder: 'rgba(31, 30, 29, 0.06)',
  mask: 'rgba(240, 238, 230, 0.8)',
  floatShadow: 'rgba(31, 30, 29, 0.04) 0 0 0 1px, rgba(31, 30, 29, 0.05) 0 3px 6px, rgba(31, 30, 29, 0.06) 0 9px 24px',
  tabsBg: '#f0eee6',
  tabBorder: '#e3e0d4',
  checkBorder: '#d0cfce',
  checkBg: '#f7f6f5',
  checkCheckedBg: '#d0d0cf',
  checkMark: '#ececec',
};

// Claude dark: bg #262624, font #faf9f5 (solid), accent #E6987D, strong #E6987D — matches typora_claude vars
const dark = {
  accent: '#e6987d',
  accentA: (a) => `rgba(230, 153, 125, ${a})`,
  highlight: 'rgba(230, 153, 125, 0.35)',
  selection: 'rgba(217, 119, 87, 0.5)',
  ink: (a) => `rgba(250, 249, 245, ${a})`,
  ink30: 'rgba(165, 164, 157, 0.8)',
  bg: '#262624',
  delete: '#ff8080',
  icon: 'rgba(222, 220, 209, 0.75)',
  codeBg: 'rgba(194, 192, 182, 0.05)',
  codeBlockBg: 'rgba(48, 48, 46, 0.5)',
  codeBlockFg: '#eaecf0',
  footnoteBg: 'rgba(222, 220, 209, 0.06)',
  inputBg: 'rgba(222, 220, 209, 0.1)',
  btnBg: '#30302e',
  btnBorder: '#3d3d3b',
  btnBgHover: 'linear-gradient(#30302e, #2c2c2a)',
  btnBgActive: '#2c2c2a',
  primaryFg: '#262624',
  shadowSoft: 'rgba(0, 0, 0, 0.3)',
  shadowInset: 'rgba(140, 80, 55, 0.7)',
  tableBorder: 'rgba(222, 220, 209, 0.3)',
  h1: '#faf9f5', h2: '#faf9f5', h3: '#faf9f5', h4: '#faf9f5', h5: '#faf9f5', h6: '#faf9f5',
  quoteText: '#c2c0b6',
  quoteBorder: 'rgba(222, 220, 209, 0.15)',
  hr: 'rgba(222, 220, 209, 0.3)',
  link: '#faf9f5',
  strongColor: '#e6987d',
  listMarker: '#faf9f5',
  linkUnderline: 'rgba(250, 249, 245, 0.35)',
  em: '#faf9f5',
  inlineCodeFg: '#f4a9a9',
  inlineCodeBorder: '#dedcd126',
  sideInk: (a) => `rgba(194, 192, 182, ${a})`,
  sideBg: '#262624',
  sideHover: 'rgba(250, 249, 245, 0.04)',
  itemBg: '#30302e',
  floatBg: '#30302e',
  floatHover: 'rgba(250, 249, 245, 0.06)',
  floatBorder: 'rgba(0, 0, 0, 0.2)',
  mask: 'rgba(31, 30, 29, 0.8)',
  floatShadow: 'rgba(0, 0, 0, 0.3) 0 0 0 1px, rgba(0, 0, 0, 0.35) 0 3px 6px, rgba(0, 0, 0, 0.4) 0 9px 24px',
  tabsBg: '#1f1e1d',
  tabBorder: '#3d3d3b',
  checkBorder: '#626262',
  checkBg: '#3b3b3b',
  checkCheckedBg: '#757575',
  checkMark: '#3b3b3b',
};

// Code token colors mirror typora_claude's .md-fences .cm-* rules
const prismLight = {
  name: 'Light',
  base: '#14181f', preBg: 'rgba(255, 255, 255, 0.5)',
  comment: '#6e7687', punct: '#14181f',
  tag: '#b80a18', number: '#008080', string: '#008000', operator: '#14181f',
  func: '#0051c2', keyword: '#8100c2', regex: '#b34a00',
};
const prismDark = {
  name: 'Dark',
  base: '#eaecf0', preBg: 'rgba(48, 48, 46, 0.5)',
  comment: '#818898', punct: '#eaecf0',
  tag: '#f47b85', number: '#5eeded', string: '#9be963', operator: '#eaecf0',
  func: '#7aa2ff', keyword: '#cc7bf4', regex: '#fbab60',
};

const lightVars = varsBlock(light);
const darkVars = varsBlock(dark);
const lightPrism = prismBlock(prismLight);
const darkPrism = prismBlock(prismDark);

// ---------- patch renderer ----------
const patches = [];

// dark-theme registry
{
  const anchor = 'var railscastsThemes = Object.freeze([\n\t"dark",';
  const i = ren.indexOf(anchor);
  if (i === -1) throw new Error('renderer anchor missing: railscastsThemes');
  ren = ren.slice(0, i + anchor.length) + '\n\t"claude-dark",' + ren.slice(i + anchor.length);
  patches.push('renderer: railscastsThemes += claude-dark');
}

// theme css + fns (fallback anchor: addThemeStyle)
{
  const defs =
    '//#region claude themes (custom patch)\n' +
    'var claudeThemeRev = ' + THEME_REV + ';\n' +
    'var claude_theme_default$1 = ' + JSON.stringify(lightVars) + ';\n' +
    'var claude_theme_default = ' + JSON.stringify(lightPrism) + ';\n' +
    'var claude_dark_theme_default$1 = ' + JSON.stringify(darkVars) + ';\n' +
    'var claude_dark_theme_default = ' + JSON.stringify(darkPrism) + ';\n' +
    'var claude = () => {\n\treturn claude_theme_default$1 + "\\n" + claude_theme_default;\n};\n' +
    'var claudeDark = () => {\n\treturn claude_dark_theme_default$1 + "\\n" + claude_dark_theme_default;\n};\n';
  let anchor = 'var graphite = () => {';
  let i = ren.indexOf(anchor);
  if (i === -1) { anchor = 'var addThemeStyle = '; i = ren.indexOf(anchor); }
  if (i === -1) throw new Error('renderer anchor missing: graphite()/addThemeStyle');
  ren = ren.slice(0, i) + defs + ren.slice(i);
  patches.push('renderer: claude theme definitions injected');
}

// switch cases
{
  const i = ren.indexOf('case "graphite":');
  if (i === -1) throw new Error('renderer anchor missing: case "graphite"');
  const j = ren.indexOf('break;', i);
  const ins = '\n\t\tcase "claude": themeStyleEle.innerHTML = patchTheme(claude()); break;\n\t\tcase "claude-dark": themeStyleEle.innerHTML = patchTheme(claudeDark()); break;';
  ren = ren.slice(0, j + 6) + ins + ren.slice(j + 6);
  patches.push('renderer: switch cases claude/claude-dark');
}

// preferences theme list
{
  const i = ren.indexOf('var themes = [');
  if (i === -1) throw new Error('renderer anchor missing: themes array');
  const seg0 = ren.indexOf('{ name: "light" },', i);
  if (seg0 === -1) throw new Error('renderer anchor missing: { name: "light" }');
  ren = ren.slice(0, seg0) + '{ name: "claude" },\n\t' + ren.slice(seg0);
  const seg1 = ren.indexOf('{ name: "dark" },', i);
  if (seg1 === -1) throw new Error('renderer anchor missing: { name: "dark" }');
  ren = ren.slice(0, seg1) + '{ name: "claude-dark" },\n\t' + ren.slice(seg1);
  patches.push('renderer: preferences themes list');
}

fs.writeFileSync(REN, ren);

// ---------- patch main ----------
let mainJs = fs.readFileSync(MAIN, 'utf8');
{
  let i = mainJs.indexOf('["catppuccin-latte", "#eff1f5"],');
  if (i === -1) throw new Error('main anchor missing: themeBackgroundColors light');
  i += '["catppuccin-latte", "#eff1f5"],'.length;
  mainJs = mainJs.slice(0, i) + '\n\t["claude", "#faf9f5"],' + mainJs.slice(i);
  let j = mainJs.indexOf('["cyberdream", "#16181a"],');
  if (j === -1) throw new Error('main anchor missing: themeBackgroundColors dark');
  j += '["cyberdream", "#16181a"],'.length;
  mainJs = mainJs.slice(0, j) + '\n\t["claude-dark", "#262624"],' + mainJs.slice(j);
  patches.push('main: themeBackgroundColors');

  let k = mainJs.indexOf('["catppuccinLatte", "catppuccin-latte"],');
  if (k === -1) throw new Error('main anchor missing: LIGHT_THEMES');
  k += '["catppuccinLatte", "catppuccin-latte"],'.length;
  mainJs = mainJs.slice(0, k) + '\n\t["claudeLight", "claude"],' + mainJs.slice(k);
  let m = mainJs.indexOf('["cyberdream", "cyberdream"],');
  if (m === -1) throw new Error('main anchor missing: DARK_THEMES');
  m += '["cyberdream", "cyberdream"],'.length;
  mainJs = mainJs.slice(0, m) + '\n\t["claudeDark", "claude-dark"],' + mainJs.slice(m);
  patches.push('main: LIGHT/DARK_THEMES');

  const anchor = 'var railscastsThemes = Object.freeze([\n\t"dark",';
  const n = mainJs.indexOf(anchor);
  if (n === -1) throw new Error('main anchor missing: railscastsThemes');
  mainJs = mainJs.slice(0, n + anchor.length) + '\n\t"claude-dark",' + mainJs.slice(n + anchor.length);
  patches.push('main: railscastsThemes');
}
fs.writeFileSync(MAIN, mainJs);

// ---------- patch i18n ----------
const labels = {
  en: { claudeLight: 'Claude', claudeDark: 'Claude Dark' },
  'zh-CN': { claudeLight: 'Claude 浅色', claudeDark: 'Claude 深色' },
  'zh-TW': { claudeLight: 'Claude 淺色', claudeDark: 'Claude 深色' },
};
const localeDir = 'mt-extracted/static/locales';
if (fs.existsSync(localeDir)) {
  for (const f of fs.readdirSync(localeDir)) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(localeDir, f);
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (!j.menu || !j.menu.theme) continue;
    const lang = f.replace('.min.json', '').replace('.json', '');
    const lab = labels[lang] || labels.en;
    j.menu.theme.claudeLight = lab.claudeLight;
    j.menu.theme.claudeDark = lab.claudeDark;
    fs.writeFileSync(p, JSON.stringify(j, null, f.endsWith('.min.json') ? 0 : 2) + (f.endsWith('.min.json') ? '' : '\n'));
    patches.push('i18n: ' + f);
  }
}

console.log('ALL PATCHES OK:');
for (const p of patches) console.log(' -', p);
