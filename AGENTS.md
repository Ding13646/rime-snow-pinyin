# 冰雪拼音开发约定

## 通用约定

始终用中文回复。仓库包含五个方案：冰雪键道（`snow_jiandao`，顶功）、冰雪小鹤（`snow_flypy`，无顶功）、冰雪林氏17（`snow_lx17`）、冰雪格道17（`snow_gd17`）、冰雪16宫格（`snow_16gong`）；后四个基于双拼，参考键道生成。

Markdown 每个段落、列表项各写一行，不按行宽硬换行；只在段落、列表项、标题、表格行、代码块之间换行。列表项的第二段空一行并缩进；代码块和 YAML 注释不受此限。

中文叙述统一使用直角引号「」，嵌套引用使用『』。代码语法的引号、输入方案实际输出的标点及其说明保留原字符。

## 目录与部署

外部方案子模块统一在 `deps/`：雾凇拼音为 `rime-ice`（生成词库用），部件全拼为 `rime-radical-pinyin`。首次克隆或更新依赖后运行 `git submodule update --init deps/rime-radical-pinyin`。

反查与命令引导用「小写 + 大写」组合激发，定义下放到各方案 patch（基座保留上游默认 `i`/`a`/`u`/`o`/`i`）：`aA` 拼音反查、`uU` 笔画与部件反查、`oO` lua 命令（缓冲、数字、计算、日期、统计，`lua/input` 为 `oO`）、`iI` 重复上屏，符号 `/`；单按小写键保持原行为（单 `u` 出笔画候选），为声声词 1-4 码留出空间。affix prefix 为两字符（如 `aA`），lua 翻译器的 prompt 从 `lua/input` 读取两字符组合；`ss` 的段检查放行 `abc` 与 `pinyin`/`stroke`/`lua` 引导段（小鹤声声词码与引导组合共存）。

`radical_pinyin.schema.yaml`、`radical_pinyin.dict.yaml` 已入库跟踪（`radical_pinyin` 是部件反查棱镜的编译源）；更新子模块后把词典复制到根目录提交，不要手改子模块内文件。

```sh
bun scripts/link.ts link      # 幂等建立软链；新增文件后重跑，冲突确认后加 --force
bun scripts/link.ts unlink    # 还原成独立副本
bun scripts/link.ts sync      # 手动单向镜像到 iCloud，并重新打包
```

- `~/.local/share/fcitx5/rime` 的 `snow_*.schema.yaml`、`snow_*.dict.yaml`、`snow_*.fixed.txt`、`snow_*_ss.txt`、`snow_algebra.yaml`、`grammar.yaml`、`rime_frost.dict.yaml`、`frost_dicts/`、`predict.userdb` 和 `lua/snow` 是本仓库软链，修改后只需重新部署，**不需要同步**；修改 Lua 后部署会重建状态并重新 `require`，无需重启输入法。
- iOS 元书方案位于 iCloud 的 `RimeUserData/rime-snow-pinyin`。iCloud 不跟随软链，`sync` 仅复制有变化的文件并清理已删除项；需要在 iOS 使用改动时手动运行。它还用系统 `zip` 替换 `~/Library/Mobile Documents/iCloud~com~ihsiao~apps~Hamster3/Documents/sync/rime-snow-pinyin.zip`，保留相对路径。Android 元书通过应用导入方案。
- `.gitignore` 排除的 `*.custom.yaml`、`*.userdb`、`build/`、`user.yaml`、`installation.yaml` 各自独立，在仓库跑 mira 不会污染实际词频。

## 开发脚本

在仓库根目录运行命令，依赖用 `bun install --cwd scripts` 安装。脚本通过 `scripts/lib/paths.ts` 定位资源；显式传入的相对路径按调用目录解析。`generate-*` 生成数据，`export-*` 导出已有数据；公共逻辑、源数据、皮肤、实验工具分别在 `scripts/lib/`、`scripts/data/`、`scripts/skin/`、`scripts/experiments/`。

```sh
bun run --cwd scripts format          # 格式化 TypeScript 和 JSON
bun run --cwd scripts check:format    # 检查格式
```

下表脚本用 `bun scripts/<脚本名>` 运行；`data/`、`lib/` 相对 `scripts/`，`output/` 为仓库根目录下被 Git 忽略的输出目录。

| 脚本与参数 | 输入与用途 | 默认输出 |
| --- | --- | --- |
| `generate-pinyin-dict.ts [输出文件]` | `data/tygf-pinyin.tsv` 与 `lib/character-pinyin.ts` 中固定版本的在线大字集拼音 | `snow_pinyin.dict.yaml` |
| `check-pinyin-dict.ts` | 离线检查单字词典全部读音在冰雪键道中的完整音节编码，异常时退出失败 | 不写文件 |
| `generate-word-dicts.ts [base ext tencent] [--output-dir 目录]` | 雾凇子模块 `deps/rime-ice/cn_dicts/` 与当前单字词典；省略词库名时生成三份 | `snow_pinyin.*.dict.yaml`；未确定读音写入 `diff/` |
| `generate-stroke-dict.ts <输入文件> [输出文件]` | 外部三列笔画 TSV，格式见「笔画与地区字形」 | `snow_bihua.dict.yaml` |
| `annotate-words.ts <词表> [输出文件]` | 每行一个词，可带后续 TSV 列；优先查现有词典，缺词时调用注音库 | `output/annotated-words.tsv` |
| `export-user-dict.ts <用户词典快照> [输出文件]` | 读取 Rime 文本快照，按使用次数排序 | `output/user-dict.tsv` |

词典生成默认更新仓库产物，审阅时指定临时路径，例如 `bun scripts/generate-word-dicts.ts base --output-dir /tmp/snow-word-dicts`；诊断文件随输出写入 `diff/`。注音逻辑在 `lib/word-pinyin.ts`，按需初始化且不写文件；`data/word-pinyin-overrides.tsv` 修正词语读音，`data/complete-pinyin-overrides.tsv` 修正 pinyin-pro 完整词库。

运行时词库已改为 `rime_frost`（`rime_frost.dict.yaml` 与 `frost_dicts/`）；`generate-pinyin-dict.ts`、`generate-word-dicts.ts` 生成的 `snow_pinyin.*.dict.yaml` 不再随包分发。

### 皮肤

`bun scripts/generate-skins.ts [输出目录] [--backend hamster|trime|all] [--trime-toolbar-width 按键总宽度dp]` 生成冰雪键道的 35 键皮肤（含无刻版），默认 `all`，输出到调用目录的 `output/skins/{hamster,trime}/`。单后端直接写入指定目录；显式选 `--backend hamster` 且不传目录时，写入 iOS 元书的 `.../Hamster3/Documents/Skins/`。Android 或审阅产物应显式指定目录，如 `/tmp/snow-skins`。

布局、配色、共用类型分别在 `scripts/skin/{layouts,palette,types}.ts`；元书和同文后端为 `hamster.ts`、`trime.ts`：

- 元书输出 iOS、Android 共用皮肤目录、亮暗预览 `demo.png` 和 `.cskin`；图标用 `{ ios, android }` 映射，打包依赖系统 `zip`。`.cskin` 内必须只有一个与皮肤同名的根目录。
- 同文每组输出一份 `.trime.yaml`，复用内置 `trime.yaml` 样式、安卓键表和新版工具栏。工具栏依次为菜单、常用语、剪贴板、编辑、中文、ABC、收起；菜单靠左，其余靠右。默认七键各 50 dp、总宽 350 dp；`--trime-toolbar-width 315` 对应各 45 dp。
- `.github/workflows/release.yml` 分别打包 `snow-pinyin-skins-hamster.zip`（目录与 `.cskin`）和 `snow-pinyin-skins-trime.zip`（主题文件）。

### 实验工具

`scripts/experiments/` 需自行提供外部语料，不参与发布：`frequency/derive-character-frequency.ts <语料目录> [输出文件]` 推导单字剩余词频；`frequency/resegment-word-frequency.ts <语料目录> <玲珑词表> [输出文件]` 重新分词。

## 版本与发布

版本唯一来源是 `lua/snow/snow.lua` 的 `snow.version`，不要手改 YAML 版本号。生成词典也从 `scripts/version.ts` 读取版本；词典头不支持 Rime `__include`。

```sh
bun scripts/version.ts 0.3.12   # 更新 snow.lua 和全部 snow_*.schema.yaml、snow_*.dict.yaml
bun scripts/version.ts          # 查看版本
bun scripts/version.ts --check  # 检查全部 YAML 版本；可再传入发布标签核对
```

发布前必须通过功能、词典和性能门禁，并核对标签与全部版本号一致。`release.yml` 打包 `snow-pinyin.zip`、皮肤包和预览安装包；`snow_algebra.yaml`、`grammar.yaml`、`rime_frost.dict.yaml`、`frost_dicts/`、`predict.userdb`、`default.custom.yaml`、`squirrel.custom.yaml` 随压缩包分发，`recipe.yaml` 的 `install_files` 也显式包含它们。

声声词表 `snow_<方案>_ss.txt` 由 `top_1000_2_and_3_words.txt` 生成：二三字词前 1000 名按各方案声母首键映射编码，编码相同取词频权重大者；码为 1-4 个声母键，引号与 Tab 等效上屏。`ss.lua` 按 `schema_id` 选择词表与首键集合（`SCHEMAS`），新增方案时补一项。

冰雪小鹤通过 `predictor` 处理器 + `predict_translator` 翻译器 + `prediction` 开关接入 librime-predict（`predictor/db` 指向 `predict.userdb`），上屏后按用户历史预测下一个词；mira 下该流程会挂起，验证依赖实机。

`build/kMandarin17.reverse.bin` 是预编译的反查注音库，`lookup_pinyin` 通过它给 `stroke` 段的反查候选注音；它由 `.gitignore` 单独放行并随用户包分发，发版用户包的 `build/` 里只保留这一个文件，不要删除。

## 笔画与地区字形

笔画反查使用生成的 `snow_bihua.dict.yaml`，不要手改；冰雪键道通过 `snow_jiandao_bihua` 棱镜查询，辅助码则来自 `snow_jiandao_chaifen` 拆字和 `radical_jiandao.txt` 编码。

在 `*.custom.yaml` 选择字形来源，重新部署即可，无需重建词典：

```yaml
patch:
  translator/shape_sources: [G, T]
```

- 标签区分大小写，多个取并集；省略或 `null` 默认 `[G]`，`[]` 只保留无标签记录，无标签记录始终可用。全部标签为 `[G, H, T, J, K, N, V, M, S, B, U]`。
- 仅影响可用笔顺与辅助码提示，不影响普通拼音候选；原表未收录的字不做辅助码过滤。
- 原表为三列 TSV：单字、空格分隔的 `1`～`5` 笔画、逗号分隔的标签（可空）；横竖撇点折对应 `12345`。生成器校验记录、合并同字同笔顺标签，跳过并报告空笔画，输出如 `令\t34154HNTV`。
- 更新原表后运行 `bun scripts/generate-stroke-dict.ts /path/to/strokes.tsv [输出文件]`，再跑 `bun scripts/test.ts`。
- 棱镜先用 `xform/[A-Z]+$//` 去标签，再映射按键；查询、排序、补全交给原生 table translator。`bihua.lua` 通过 `ReverseLookup("snow_bihua")` 读取完整编码，按候选词典语言名识别笔画候选，须在反查过滤器前筛选来源并修正补全提示。

## 测试

功能测试在 `spec/snow_jiandao.test.yaml`，由 mira 运行。`bun scripts/test.ts` 先跑功能测试，通过后串行测性能；失败只打印失败用例，完整日志见输出中的临时目录。

```sh
bun scripts/test.ts                  # 冰雪键道
bun scripts/check-pinyin-dict.ts     # 修改词典或拼写运算后离线检查音节编码
```

### 音节校验与测试环境

`generate-pinyin-dict.ts` 写入前校验输入读音；`test.ts`、CI 和发布流程离线检查现有词典的键道完整音节编码。`scripts/lib/pinyin-validation.ts` 依据 `../input` 的教程定义规则：键道为声韵两码。检查展开实际拼写规则与引用，保留完整音节的 `derive` 分支，跳过 `abbrev`、简码、顶功及字母伪音节；异常应修正来源或运算，不得放宽正则。

`test.ts` 的以下隔离措施不得省略：

- 精简源目录：只复制 `git ls-files -co --exclude-standard` 文件，排除本机词频等私有文件。
- `default.custom.yaml` 只启用被测方案。
- 独立 `TMPDIR`：mira 启动时会删除固定的 `$TMPDIR/mira`。
- 独立编译缓存：先复制 `build/`，结束后写回更新文件；带 patch 的部署会改写方案缓存。直接在仓库跑 mira 时必须串行。

单部署可用 mira `-R`；它直接用仓库作源目录，先清测试词频，且不能与其他 mira 并行：

```sh
rm -rf *.userdb
mira -C build -R '^popping$' spec/snow_jiandao.test.yaml
```

### 用例约束

- 断言只可用 `cand`（元素含 `.text`、`.comment`）、`preedit`、`commit`；`assert` 被包进 `return (...)`，只能写表达式。临时探查可用 `error(...)`。
- `has()` 扫全部候选；断言首页时用 `page()`（`page_size` 为 6）。固定词每类只测一例，整表校验直接比对 `snow_jiandao.fixed.txt`。
- **造词断言 `cand[1]`，不要断言 `commit`**：末尾两个空格会把缓冲内容上屏，无法据此判断是否入库。
- 同一 `deploy` 的各 `send` 共享用户词典。原始词频断言放 `popping` 且排在上屏用例之前；动态码长、自动造词、缓冲造词等写词典用例放独立部署。

### 按键反馈延迟

`bun scripts/benchmark-latency.ts [方案]` 用带 librime-lua 的 `rime_api_console` 测量，默认每场景 30 轮；依赖 Bun、`scripts/` 依赖及已初始化的部件子模块。控制台从 PATH 查找，可用 `--console` 指定。用例在 `scripts/data/latency-cases.ts`，覆盖查词、反查、补码、翻页、退格、顶屏、缓冲造词和连续输入。

```sh
bun scripts/benchmark-latency.ts --ci  # 全部场景，至少 200 轮，统一预算
bun scripts/benchmark-latency.ts jiandao --case '^dense-prefix$' --rounds 200 --max-p99-ms 50
bun scripts/check-latency.ts output/latency/report.json  # 复查已保存报告
```

预算 `scripts/lib/latency-budget.ts`：P50 < 10 ms、P95 < 25 ms、P99 < 50 ms；各场景及按键位置 P99 < 50 ms，首次最大反馈 < 100 ms。不得放宽预算、删除离群值或重跑择优。

## Lua 开发

适用于 `lua/snow/` 自写组件；`calculator.lua` 的外来函数库不强求。

### 结构与语法

- 文件顺序：头注释（`-- xxx处理器`＋一句说明）→ 按需 `local snow = require "snow.snow"` → `---@class XxxEnv: Env` → 组件表 → `return`，各部分空行分隔。`statistics.lua` 头注释另含用户用法和各量说明。
- 组件表用 `processor` / `segmentor` / `translator` / `filter`，不用 `this`、`select`；多组件分别命名并 `return { a = a, ... }`。translator 也用表＋`init` / `func`；配置在 `init` 读入 `env`，空 `init` / `fini` 省略。
- `env` 类型用本模块名＋`Env`，所有 `---@param env` 引用本模块类；局部变量和字段用 snake_case。
- 参数固定为 processor `(key_event, env)`、translator `(input, segment, env)`、filter `(translation, env)` 和 `tags_match(segment, env)`。
- 不定义全局变量／函数；辅助函数用 `local function`。所有方案共用 Lua 状态；动态求值用专用环境表 `load(chunk, name, "t", env)`，不写 `_G`。
- 2 空格缩进，无 tab、行尾分号和多余条件括号；`require "x"` 不加括号。字符串默认双引号，含 `"` 时才用单引号。
- 只有 `nil`、`false` 为假；空字符串、0、空表均为真。分别用 `s == ""`、`#list == 0`、`next(map) == nil` 判空。

### 生命周期

- filter 必须用 `tags_match` 限定段（通常 `abc`，反查再加 `pinyin`）。
- `notifier:connect` 结果存入 `env`，`fini` 必须 `disconnect()`。
- `fini` 调用 `snow.release_db` 释放词典，将 `Memory`、`ReverseLookup`、`Component.*` 等 C++ 对象置 `nil` 后 `collectgarbage()`。

### lua 的三处坑

- **`fini` 不可读 `env.engine.schema`**：切换时它已指向新方案。`snow.get_db` / `release_db` 按方案名引用计数，须在 `init` 把名字存入 `env`，`fini` 使用保存值；否则旧库 `LOCK` 无法释放，同步报 `already held by process`。
- **`LevelDb(name)` 会被 Rime 当用户词典同步**：键须为 `编码 \t词`（编码后有空格，恰好一个 `\t`），值须为 `c=… d=… t=…`；错误格式会被丢弃或归零。合并取同键 `c` 的最大值，跨设备计数应含 installation_id 且只增不减，见 `statistics.lua`。
- **候选跨度与质量分**：`snow.prepare` 用于修正代理码产生的 candidate 起止位置和虚高质量分；目前键道简拼走原生翻译器，新增代理码方案时才需要它。

### 输入统计

修改前先读 [docs/statistics.md](docs/statistics.md)，修改后按其「验证方法」检查两个不变式；spec 不含统计用例。

- 新写的直接上屏一律调用 `snow.commit_text`；`engine:commit_text` 不触发 `commit_notifier`，会漏记字数并把按键带入下一次上屏。
- 顶屏、略码等「触发键属于下一词」的上屏，须在上屏前设 `snow.handover`，上屏后恢复 `nil`。

### 类型检查

自写 Lua 须无 lua-language-server 的 strict 警告，含 `no-unknown`。全量检查用：

```sh
echo '{"diagnostics.groupFileStatus":{"strict":"Any","strong":"Any"},"diagnostics.disable":["lowercase-global"]}' > "$TMPDIR/luarc.json"
~/.vscode/extensions/sumneko.lua-*/server/bin/lua-language-server --check="$PWD" \
  --configpath="$TMPDIR/luarc.json" --checklevel=Warning --logpath="$TMPDIR/luals" --check_format=json
```

常见类型陷阱：

- `snow.get_db` 锁冲突时可返回 `nil`，持有字段标 `LevelDb|nil`，使用前判空。
- 0 起始索引表标 `table<integer, string>`，不用 `string[]`。
- 动态字符串键表用 `---@type table<string, string>` 标注。
- 分支分别赋字面量和 `x:sub(...)` 可能触发 `no-unknown`，改成 `x = cond and "" or x:sub(1, -2)`。

## 组件顺序

冰雪键道的组件顺序如下，不要仅按多数现状判断。`statistics` 必须第一，看到被其他组件吃掉的每个键；`url` 在 `shape_processor` 前，URL 关键字里的 a/i/o 不能被辅助码筛选规则吃掉；`shape_processor` 在 `popping`、`key_binder` 前，辅助码键可触发顶屏；`ss` 在 `popping` 前，两码状态拦截引号直接上屏声声词；`select_character` 在 `popping` 前，`[`、`]` 命中标点大写顶；`popping` 在 `recognizer` 前，键道无前缀 `jianpin` 会匹配普通编码并 `PushInput`，放前会让 3 码以上顶功静默失效；`user_dict` 在 `key_binder` 前，`Control+bracketleft` 绑定 Escape。

```yaml
  processors:
    - lua_processor@*snow.statistics*processor
    - ascii_composer
    - lua_processor@*snow.url
    - lua_processor@*snow.shape_processor
    - lua_processor@*snow.ss*processor
    - lua_processor@*snow.select_character
    - lua_processor@*snow.popping
    - recognizer
    - lua_processor@*snow.user_dict
    - key_binder
    - speller
    - punctuator
    - selector
    - navigator
    - express_editor
  segmentors:
    - ascii_segmentor
    - matcher
    - abc_segmentor
    - affix_segmentor@stroke
    - affix_segmentor@pinyin
    - affix_segmentor@jianpin
    - punct_segmentor
    - fallback_segmentor
  translators:
    - punct_translator
    - script_translator
    - script_translator@jianpin
    - table_translator@stroke
    - table_translator@radical
    - script_translator@pinyin
    - lua_translator@*snow.buffered
    - lua_translator@*snow.datetime
    - lua_translator@*snow.statistics*translator
    - lua_translator@*snow.number
    - lua_translator@*snow.unicode*translator
    - lua_translator@*snow.calculator
    - history_translator
  filters:
    - lua_filter@*snow.placeholder
    - lua_filter@*snow.bihua
    - lua_filter@*snow.enforce
    - reverse_lookup_filter@lookup_pinyin
    - reverse_lookup_filter@lookup_jiandao
    - lua_filter@*snow.fix
    - lua_filter@*snow.shape_filter
    - lua_filter@*snow.postpone
    - uniquifier
    - simplifier
    - lua_filter@*snow.hint
    - lua_filter@*snow.unicode*filter
    - lua_filter@*snow.ss*filter
```

改 preedit 的 filter 必须在 `uniquifier` 前：`UniquifiedCandidate::preedit()` 恒返回首个被合并候选的 preedit，包装器上的修改会丢失；`comment` 不受影响。改 processors 必须跑 `bun scripts/test.ts`。

## 简拼棱镜

冰雪键道的简拼由 `snow_jiandao_jianpin` 提供，键为单声母；三字及以上词可用「声母 + 大写韵母」补韵母（如 `wH`）。棱镜的字母声母规则必须与主方案一致：辅音为该字母，元音为 `x`；改动字母规则时同步修改 `snow_jiandao.schema.yaml` 与 `snow_jiandao_jianpin.schema.yaml` 的 algebra。

`flypy21` 定义在 `snow_algebra.yaml`，主方案与简拼棱镜都通过 `__include` 引用它；新增或修改声母键、韵母键时只改这一份。简拼的大写韵母 `derive` 按两键码生成，若改回三键码需同步调整。文件内还保留 `jd6`（键道声韵两键运算，声调在运算中被吸收，可直接配合两键大写韵母派生）以及 `lx17`、`gd17`、`16gong`、`flypy_legacy` 等备用方案。

冰雪小鹤使用 `snow_flypy_jianpin`，主方案与棱镜都引用 `snow_algebra.yaml:/flypy`（标准小鹤双拼）；它的声声词词表是 `snow_flypy_ss.txt`，首键按 zh→v、ch→i、sh→u、零声母取 a/o/e 映射。`ss.lua` 按 `schema_id` 选择词表和首键集合，新增方案时在 `SCHEMAS` 里补一项。小鹤不启用 popping，标点由 Rime 默认行为上屏；URL 只靠 `recognizer/patterns/url`，不挂 `snow.url`。`ss.lua` 的 `require_popping` 区分两方案：键道要求顶功，小鹤不需要。
