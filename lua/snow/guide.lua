-- 组合引导处理器
-- 单小写键 a/u/o/i 打进编码（无对应音节，无候选），第二键大写 A/U/O/I
-- 组成反查/命令引导组合（aA/uU/oO/iI），由 recognizer 的 pattern 激发对应段；
-- 空输入时的大写键转为小写进编码，供 avuio 起码的固顶词（大写首键打法）

local snow = require "snow.snow"

local processor = {}

---@class GuideEnv: Env

-- 大写键 → 对应的小写引导键
local PAIRS = { A = "a", U = "u", O = "o", I = "i" }

---@param key_event KeyEvent
---@param env GuideEnv
function processor.func(key_event, env)
  if key_event:release() or key_event:ctrl() or key_event:alt()
      or key_event:super() or key_event:caps() then
    return snow.kNoop
  end
  local keycode = key_event.keycode
  if keycode <= 0x20 or keycode >= 0x7f then
    return snow.kNoop
  end
  local ch = utf8.char(keycode)
  local pair = PAIRS[ch]
  if not pair then
    return snow.kNoop
  end
  local context = env.engine.context
  local input = context.input
  -- 空输入时的大写键：转为小写进编码（固顶词 avuio 首键）
  if input == "" then
    context:set_input(pair)
    return snow.kAccepted
  end
  -- 组合第二键：编码尾是对应小写、来键是大写 → 拼成组合激发
  if input:sub(-1) == pair then
    context:set_input(input .. ch)
    return snow.kAccepted
  end
  return snow.kNoop
end

return processor
