# 冰雪拼音

> 优雅、高效、个性化的中文输入体验

冰雪拼音是基于 [Rime](https://rime.im) 的中文输入方案集，包含冰雪键道等顶功方案，以及无顶功的冰雪小鹤，支持个性化词频、简拼、声声词和多种反查方式。

当前版本：[0.3.14](https://github.com/rimeinn/rime-snow-pinyin/releases/tag/v0.3.14)。

[使用文档](https://input.tansongchen.com) · [方案教程](https://input.tansongchen.com/snow-jiandao/) · [下载最新版](https://github.com/rimeinn/rime-snow-pinyin/releases/latest) · [QQ 群](https://qm.qq.com/q/vI6avK1YT6)

## 输入方案

| 方案 | 特点 | schema_id |
| --- | --- | --- |
| [冰雪键道](https://input.tansongchen.com/snow-jiandao/) | 音形码、字词均衡、三四码顶 | `snow_jiandao` |
| 冰雪小鹤 | 标准小鹤双拼、无顶功、保留简拼与声声词，当前关闭预测 | `snow_flypy` |
| 冰雪林氏17 | 林氏17 双拼的顶功方案 | `snow_lx17` |
| 冰雪格道17 | 格道17 双拼的顶功方案 | `snow_gd17` |
| 冰雪16宫格 | 16宫格 双拼的顶功方案 | `snow_16gong` |

## 下载安装

1. 安装所在平台的 Rime 前端，例如 Windows 小狼毫、macOS 或 Linux 小企鹅、iOS 或 Android 元书、Android 同文、HarmonyOS 超越输入法；下载入口见[使用文档](https://input.tansongchen.com/#下载安装)。
2. 从[发布页面](https://github.com/rimeinn/rime-snow-pinyin/releases/latest)下载 `snow-pinyin.zip`，解压到 Rime 用户文件夹，使 `snow_*.schema.yaml`、`snow_algebra.yaml`、`grammar.yaml`、`rime_frost.dict.yaml`、`frost_dicts/`、`lua/snow/` 和 `build/kMandarin17.reverse.bin` 直接位于其中。
3. 在 `default.custom.yaml` 的 `patch/schema_list` 中加入需要的方案，执行「重新部署」，再从方案选单中选择。下例启用冰雪键道，也可替换为上表中的其他 `schema_id`；已有配置时，将条目合并到现有的 `patch` 下。

```yaml
patch:
  schema_list:
    - schema: snow_jiandao
```

首次部署需等待大词库编译完成。方案包包含 `default.custom.yaml` 和 `squirrel.custom.yaml`；已有个人配置时，请合并所需设置并保留自己的配置。

## 常用输入与反查

### 简拼与大写补韵母

冰雪键道支持三字及以上词的声母简拼，并可在前三个声母后追加对应的大写韵母键，补充读音、减少重码。例如「输入法」可输入 `erf`，也可用 `eJrf`、`erJf`、`erfS` 分别补第一、二、三个字的韵母，或用 `eJrJfS` 同时补齐。

两字词使用常规双拼；已有四个声母时，再输入大写字母会追加长词的后续声母。

### 声声词

声声词开启时，输入匹配的 1～4 个声母键，再按 `Tab` 或单引号 `'` 直接上屏预设高频词。例如冰雪键道输入 `bbb` 后按 `Tab` 或 `'`，上屏「并不比」。顶功方案须处于顶功模式；冰雪小鹤可直接使用。0.3.14 修复了没有普通候选时声声词不显示的问题。

### 反查与命令

0.3.14 的默认入口因方案而异：冰雪键道、林氏17、格道17、16宫格使用单个小写字母，冰雪小鹤使用「小写 + 大写」组合，组合中的第二个字母须大写。

| 功能 | 键道、林氏17、格道17、16宫格 | 小鹤 |
| --- | --- | --- |
| 拼音反查 | `a` | `aA` |
| 笔画与部件全拼反查 | `u` | `uU` |
| 缓冲、数字、计算、日期与输入统计命令 | `o` | `oO` |
| 重复上屏 | `i` | `iI` |

例如冰雪键道输入 `uwangyan`、冰雪小鹤输入 `uUwangyan`，均可按部件全拼查「琰」，候选旁显示带调拼音。部件词库来自 [rime-radical-pinyin](https://github.com/mirtlecn/rime-radical-pinyin)，发布包已包含所需文件。冰雪键道还可用 `i` 加符号码输入符号，例如 `ia` 输入 `ā`。

### 常用快捷键

| 按键 | 功能 |
| --- | --- |
| `Control+j` | 切换缓冲输入 |
| `Control+u` | 切换候选 Unicode 注解 |
| `Control+t` | 切换拆分显示 |
| `Control+Shift+s` | 开关声声词 |

## 手机皮肤

从同一发布页面按所用输入法下载皮肤包，目前提供冰雪键道的 35 键布局（含无刻版），以及亮暗配色：

| 前端 | 下载文件 | 使用方式 |
| --- | --- | --- |
| 同文（Android） | `snow-pinyin-skins-trime.zip` | 将 `.trime.yaml` 放入 Rime 用户文件夹，重新部署并选择主题 |
| 元书（iOS、Android） | `snow-pinyin-skins-hamster.zip` | 两个平台使用同一皮肤包，导入 `.cskin` 并启用 |

皮肤与输入方案需分别安装，布局应与方案匹配。布局预览、选择与导入说明见[手机皮肤](https://input.tansongchen.com/#手机皮肤)。

## 更新与个性化

更新前备份用户文件夹并执行 Rime 同步，再替换方案文件并重新部署。方案包中的 `*.custom.yaml` 应与个人配置合并；个人设置和自建词库需另行备份。

常见问题、补丁配置和数据同步见[使用文档](https://input.tansongchen.com/)，开发脚本与维护约定见 [AGENTS.md](AGENTS.md)。
