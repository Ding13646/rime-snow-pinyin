# 冰雪键道

> 优雅、高效、个性化的中文输入体验

冰雪键道是基于 [Rime](https://rime.im) 的音形码输入方案，通过顶功和个性化词频提升输入效率。

[使用文档](https://input.tansongchen.com) · [方案教程](https://input.tansongchen.com/snow-jiandao/) · [下载最新版](https://github.com/rimeinn/rime-snow-pinyin/releases/latest) · [QQ 群](https://qm.qq.com/q/vI6avK1YT6)

## 输入方案

| 方案 | 特点 | schema_id |
| --- | --- | --- |
| [冰雪键道](https://input.tansongchen.com/snow-jiandao/) | 音形码、字词均衡、三四码顶 | `snow_jiandao` |

## 下载安装

1. 安装所在平台的 Rime 前端，例如 Windows 小狼毫、macOS 或 Linux 小企鹅、iOS 或 Android 元书、Android 同文、HarmonyOS 超越输入法；下载入口见[使用文档](https://input.tansongchen.com/#下载安装)。
2. 从[发布页面](https://github.com/rimeinn/rime-snow-pinyin/releases/latest)下载 `snow-pinyin.zip`，解压到 Rime 用户文件夹，使 `snow_*.schema.yaml`、`snow_jiandao_algebra.yaml` 和 `lua/snow/` 直接位于其中。
3. 在 `default.custom.yaml` 的 `patch/schema_list` 中加入冰雪键道，执行「重新部署」，再从方案选单中选择。

```yaml
patch:
  schema_list:
    - schema: snow_jiandao
```

首次部署需等待大词库编译完成。

冰雪键道可用 `u` 引导部件全拼反查，例如输入 `uwangyan` 查「琰」（王＋炎），候选旁显示 `yan3`；此入口同时保留原有笔画反查。部件词库来自 [rime-radical-pinyin](https://github.com/mirtlecn/rime-radical-pinyin)，发布包已包含所需文件。

## 手机皮肤

从同一发布页面按所用输入法下载皮肤包，目前提供冰雪键道的 35 键布局（含无刻版），以及亮暗配色：

| 前端 | 下载文件 | 使用方式 |
| --- | --- | --- |
| 同文（Android） | `snow-pinyin-skins-trime.zip` | 将 `.trime.yaml` 放入 Rime 用户文件夹，重新部署并选择主题 |
| 元书（iOS、Android） | `snow-pinyin-skins-hamster.zip` | 两个平台使用同一皮肤包，导入 `.cskin` 并启用 |

皮肤与输入方案需分别安装，布局应与方案匹配。布局预览、选择与导入说明见[手机皮肤](https://input.tansongchen.com/#手机皮肤)。

## 更新与个性化

更新前备份用户文件夹并执行 Rime 同步，再用新版方案包覆盖并重新部署。个人设置写入 `*.custom.yaml`，避免直接修改随安装包分发的文件；配置和自建词库需另行备份。

常见问题、补丁配置和数据同步见[使用文档](https://input.tansongchen.com/)，开发脚本与维护约定见 [AGENTS.md](AGENTS.md)。
