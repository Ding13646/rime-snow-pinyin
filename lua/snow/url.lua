-- URL 输入处理器
-- 关键字逐字母输入时直接推入输入串，进入网址后按键原样追加，
-- 避免被 630、四字词等顶屏规则或标点转换提前吃掉。

local snow = require "snow.snow"

---@class UrlEnv: Env

local processor = {}

local KEYWORDS = { "www", "http", "https", "ftp", "mailto", "file" }

---@param s string
---@return boolean
local function is_keyword(s)
  for _, keyword in ipairs(KEYWORDS) do
    if s == keyword then
      return true
    end
  end
  return false
end

---@param s string
---@return boolean
local function is_keyword_prefix(s)
  for _, keyword in ipairs(KEYWORDS) do
    if #s <= #keyword and keyword:sub(1, #s) == s then
      return true
    end
  end
  return false
end

---@param s string
---@return boolean
local function is_url_prefix(s)
  return s:match("^www%.") ~= nil
    or s:match("^https?:") ~= nil
    or s:match("^ftp[.:]") ~= nil
    or s:match("^mailto:") ~= nil
    or s:match("^file:") ~= nil
end

---@param key_event KeyEvent
---@param env UrlEnv
function processor.func(key_event, env)
  if key_event:release() or key_event:ctrl() or key_event:alt()
      or key_event:super() or key_event:caps() then
    return snow.kNoop
  end
  local keycode = key_event.keycode
  if keycode <= 0x20 or keycode >= 0x7f then
    return snow.kNoop
  end
  local context = env.engine.context
  local input = context.input
  local ch = utf8.char(keycode)
  -- 已进入网址：可打印 ASCII 原样追加，空格留给编辑器上屏
  if is_url_prefix(input) then
    context:push_input(ch)
    return snow.kAccepted
  end
  -- 关键字逐字母阶段：能继续构成关键字的字母原样追加
  if ch:match("^%l$") and is_keyword_prefix(input .. ch) then
    context:push_input(ch)
    return snow.kAccepted
  end
  -- 完整关键字后的 . 或 : 进入网址
  if (ch == "." or ch == ":") and is_keyword(input) then
    context:push_input(ch)
    return snow.kAccepted
  end
  return snow.kNoop
end

return processor
