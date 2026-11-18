-- Unicode 翻译器与过滤器
-- 按十六进制码点输入字符，并为候选标注 Unicode 编码和分区

local snow = require "snow.snow"

---@class UnicodeEnv: Env
---@field prompt string

local translator = {}
local filter = {}

local unicode_blocks = {
  -- 统一汉字基本集与扩展
  {
    name = "CJK",
    begin = 0x4e00,
    finish = 0x9fff,
  },
  {
    name = "CJK-A",
    begin = 0x3400,
    finish = 0x4dbf,
  },
  {
    name = "CJK-B",
    begin = 0x20000,
    finish = 0x2a6df,
  },
  {
    name = "CJK-C",
    begin = 0x2a700,
    finish = 0x2b73f,
  },
  {
    name = "CJK-D",
    begin = 0x2b740,
    finish = 0x2b81f,
  },
  {
    name = "CJK-E",
    begin = 0x2b820,
    finish = 0x2ceaf,
  },
  {
    name = "CJK-F",
    begin = 0x2ceb0,
    finish = 0x2ebef,
  },
  {
    name = "CJK-G",
    begin = 0x30000,
    finish = 0x3134f,
  },
  {
    name = "CJK-H",
    begin = 0x31350,
    finish = 0x323af,
  },
  {
    name = "CJK-I",
    begin = 0x2ebf0,
    finish = 0x2ee5f,
  },

  -- 部件
  {
    name = "部首补充",
    begin = 0x2e80,
    finish = 0x2eff,
  },
  {
    name = "部首",
    begin = 0x2f00,
    finish = 0x2fdf,
  },
  {
    name = "笔画",
    begin = 0x31c0,
    finish = 0x31ef,
  },

  -- 兼容汉字
  {
    name = "兼容",
    begin = 0xf900,
    finish = 0xfaff,
  },
  {
    name = "兼容补充",
    begin = 0x2f800,
    finish = 0x2fa1f,
  },

  -- 古文字系统
  {
    name = "西夏",
    begin = 0x17000,
    finish = 0x187ff,
  },
  {
    name = "西夏构件",
    begin = 0x18800,
    finish = 0x18aff,
  },
  {
    name = "西夏补充",
    begin = 0x18d00,
    finish = 0x18d7f,
  },
  {
    name = "契丹",
    begin = 0x18b00,
    finish = 0x18cff,
  },

  -- 标点符号与排版字符
  {
    name = "符号",
    begin = 0x3000,
    finish = 0x303f,
  },
  {
    name = "带圈",
    begin = 0x3200,
    finish = 0x32ff,
  },
  {
    name = "带圈补充",
    begin = 0x1f200,
    finish = 0x1f2ff,
  },
  {
    name = "符号",
    begin = 0x16fe0,
    finish = 0x16fff,
  },
}

---@param codepoint integer
---@return string
local function get_block_name(codepoint)
  for _, block in ipairs(unicode_blocks) do
    if codepoint >= block.begin and codepoint <= block.finish then
      return block.name
    end
  end
  return "未知分区"
end

---@param env UnicodeEnv
function translator.init(env)
  env.prompt = env.engine.schema.config:get_string("lua/input") or "o"
end

---@param input string
---@param segment Segment
---@param env UnicodeEnv
function translator.func(input, segment, env)
  if input:sub(1, #env.prompt) ~= env.prompt then
    return
  end
  local code = input:sub(#env.prompt + 1)
  if #code > 6 or not code:find("^%x+$") then
    return
  end
  local codepoint = tonumber(code, 16)
  if not codepoint or codepoint > 0x10ffff or codepoint >= 0xd800 and codepoint <= 0xdfff then
    return
  end
  local comment = (" U+%04X %s"):format(codepoint, get_block_name(codepoint))
  yield(Candidate("unicode", segment.start, segment._end, utf8.char(codepoint), comment))
end

---@param segment Segment
---@param env Env
function filter.tags_match(segment, env)
  return env.engine.context:get_option("unicode")
end

---@param translation Translation
---@param env Env
function filter.func(translation, env)
  for candidate in translation:iter() do
    local codepoint = utf8.codepoint(candidate.text)
    if candidate.type ~= "unicode" and utf8.len(candidate.text) == 1 and codepoint and codepoint >= 0x80 then
      local block_name = get_block_name(codepoint)
      snow.comment(candidate, ("%04X %s"):format(codepoint, block_name))
    end
    yield(candidate)
  end
end

return {
  translator = translator,
  filter = filter,
}
