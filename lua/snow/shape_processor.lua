-- 辅助码处理器
-- 本处理器接受辅助码按键，把它们放到上下文中

local snow = require "snow.snow"

---@param env Env
local function update(env)
  env.engine.context:refresh_non_confirmed_composition()
end

---@class ShapeConfig
---@field match string?
---@field match_shape string?
---@field accept string

---@class ShapeProcessorEnv: Env
---@field config ShapeConfig[]
---@field select_connection Connection
---@field commit_connection Connection

local processor = {}


--- 把配置里的简单正则编译成 Lua pattern；不支持的语法返回 nil（回退 FFI）。
--- 只覆盖 popping/shape 规则用到的子集：字符类、分组 (?:…)、计数 {n}/{n,}/{n,m}。
---@param re string
---@return string|nil
local function compile_lua(re)
  if not re or re == "" then
    return nil
  end
  if re:find("|", 1, true) or re:find("(?=", 1, true) or re:find("(?!", 1, true) then
    return nil
  end
  local s = re
  s = s:gsub("\\([dDsSwW])", function(c)
    return "%" .. c:lower()
  end)
  s = s:gsub("\\(.)", "%%%1")
  s = s:gsub("%(%?%:", "(")
  local pos = 1
  while true do
    local b = s:find("{", pos, true)
    if not b then
      break
    end
    local e = s:find("}", b, true)
    if not e then
      return nil
    end
    local spec = s:sub(b + 1, e - 1)
    local n, m = spec:match("^(%d+),(%d*)$")
    if not n then
      n = spec:match("^(%d+)$")
    end
    if not n then
      return nil
    end
    n = tonumber(n)
    local has_comma = spec:find(",", 1, true) ~= nil
    m = m and m ~= "" and tonumber(m) or nil
    if m and m < n then
      return nil
    end
    local j = b - 1
    if j < 1 then
      return nil
    end
    local c = s:sub(j, j)
    local astart
    if c == ")" then
      local depth = 0
      while j >= 1 do
        local ch = s:sub(j, j)
        if ch == ")" then
          depth = depth + 1
        elseif ch == "(" then
          depth = depth - 1
          if depth == 0 then
            astart = j
            break
          end
        end
        j = j - 1
      end
    elseif c == "]" then
      while j >= 1 and s:sub(j, j) ~= "[" do
        j = j - 1
      end
      astart = j
    else
      astart = j
    end
    if not astart or astart < 1 then
      return nil
    end
    local atom = s:sub(astart, b - 1)
    if atom == "" then
      return nil
    end
    -- Lua pattern 不支持对捕获组加量词（(X)? 无匹配），这类规则回退 FFI。
    if atom:sub(1, 1) == "(" then
      return nil
    end
    local rep = atom:rep(n)
    if m then
      rep = rep .. (atom .. "?"):rep(m - n)
    elseif has_comma then
      rep = rep .. atom .. "*"
    end
    s = s:sub(1, astart - 1) .. rep .. s:sub(e + 1)
    pos = astart + #rep
  end
  return "^" .. s .. "$"
end


---@param env ShapeProcessorEnv
function processor.init(env)
  local function clear()
    env.engine.context:set_property("shape_input", "")
    env.engine.context:set_property("shape_status", "")
    update(env)
  end
  local context = env.engine.context
  env.select_connection = context.select_notifier:connect(clear)
  env.commit_connection = context.commit_notifier:connect(clear)
  local shape_config = env.engine.schema.config:get_list("speller/shape")
  if not shape_config then
    return
  end
  env.config = {}
  for i = 1, shape_config.size do
    local item = shape_config:get_at(i - 1)
    if not item then goto continue end
    local value = item:get_map()
    if not value then goto continue end
    local match = value:get_value("match")
    local match_shape = value:get_value("match_shape")
    local match_str = match and match:get_string()
    local match_shape_str = match_shape and match_shape:get_string()
    local accept = value:get_value("accept"):get_string() or ""
    ---@type ShapeConfig
    local parsed = {
      match = match_str,
      match_shape = match_shape_str,
      accept = accept,
      match_lua = compile_lua(match_str),
      match_shape_lua = compile_lua(match_shape_str),
      accept_lua = compile_lua(accept),
    }
    table.insert(env.config, parsed)
    ::continue::
  end
end

---@param key_event KeyEvent
---@param env ShapeProcessorEnv
function processor.func(key_event, env)
  local input = snow.current(env.engine.context) or ""
  if input:len() == 0 then
    env.engine.context:set_property("shape_input", "")
  end
  -- 追加编码
  local context = env.engine.context
  local shape_input = context:get_property("shape_input")
  if key_event.modifier ~= 0 then
    return snow.kNoop
  end
  local segment = env.engine.context.composition:toSegmentation():back()
  if not segment then
    return snow.kNoop
  end
  if not segment:has_tag("abc") then
    return snow.kNoop
  end
  if key_event.keycode == snow.kBackSpace and shape_input ~= "" then
    -- 退格删掉一个辅助码字符
    shape_input = shape_input:sub(1, -2)
    goto update
  else
    local key_char = utf8.char(key_event.keycode)
    for _, rule in ipairs(env.config) do
      if rule.match then
        if rule.match_lua then
          if not input:match(rule.match_lua) then
            goto continue
          end
        elseif not rime_api.regex_match(input, rule.match) then
          goto continue
        end
      end
      if rule.match_shape then
        if rule.match_shape_lua then
          if not shape_input:match(rule.match_shape_lua) then
            goto continue
          end
        elseif not rime_api.regex_match(shape_input, rule.match_shape) then
          goto continue
        end
      end
      if rule.accept_lua then
        if not key_char:match(rule.accept_lua) then
          goto continue
        end
      elseif not rime_api.regex_match(key_char, rule.accept) then
        goto continue
      end
      shape_input = shape_input .. key_char
      goto update
      ::continue::
    end
    return snow.kNoop
  end
  ::update::
  context:set_property("shape_input", shape_input)
  update(env)
  return snow.kAccepted
end

---@param env ShapeProcessorEnv
function processor.fini(env)
  env.select_connection:disconnect()
  env.commit_connection:disconnect()
end

return processor
