-- 顶功处理器
-- 本处理器能够支持所有的规则顶功模式
-- 根据当前编码和新输入的按键来决定是否将当前编码或其一部分的首选顶上屏

local snow = require "snow.snow"

local processor = {}

local strategies = {
  pop = "pop",
  append = "append",
  append_raw = "append_raw",
  conditional = "conditional"
}

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

---@class PoppingConfig
---@field when string
---@field match string
---@field accept string
---@field prefix number
---@field strategy string

---@class PoppingEnv: Env
---@field popping PoppingConfig[]
---@field auto_select_pattern string
---@field option_connection Connection
---@field commit_connection Connection

---@param env PoppingEnv
function processor.init(env)
  env.option_connection = env.engine.context.option_update_notifier:connect(function(ctx, name)
    if name == "buffered" then
      local buffered = ctx:get_option("buffered")
      ctx:set_option("_auto_commit", not buffered)
    end
  end)
  env.commit_connection = env.engine.context.commit_notifier:connect(function(ctx)
    if ctx:get_option("buffered") then
      ctx:set_option("buffered", false)
    end
  end)
  local config = env.engine.schema.config
  local popping_config = config:get_list("speller/popping")
  if not popping_config then
    return
  end
  ---@type PoppingConfig[]
  env.popping = {}
  for i = 1, popping_config.size do
    local item = popping_config:get_at(i - 1)
    if not item then goto continue end
    local value = item:get_map()
    if not value then goto continue end
    local match = value:get_value("match"):get_string()
    local accept = value:get_value("accept"):get_string()
    local popping = {
      when = value:get_value("when") and value:get_value("when"):get_string(),
      match = match,
      accept = accept,
      match_lua = compile_lua(match),
      accept_lua = compile_lua(accept),
      prefix = value:get_value("prefix") and value:get_value("prefix"):get_int(),
      strategy = value:get_value("strategy") and value:get_value("strategy"):get_string()
    }
    if popping.strategy ~= nil and strategies[popping.strategy] == nil then
      snow.errorf("Invalid popping strategy: %s", popping.strategy)
      goto continue
    end
    table.insert(env.popping, popping)
    ::continue::
  end
  env.auto_select_pattern = config:get_string("speller/auto_select_pattern") or ""
end

---@param key_event KeyEvent
---@param env PoppingEnv
function processor.func(key_event, env)
  if snow.redispatching then
    return snow.kNoop
  end
  local context = env.engine.context
  local buffered = context:get_option("buffered")
  if key_event:release() or key_event:alt() or key_event:ctrl() or key_event:caps() then
    return snow.kNoop
  end
  local incoming = utf8.char(key_event.keycode)
  -- 如果输入为空格或数字，代表着作文即将上屏，此时把 kConfirmed 的片段改为 kSelected
  -- 这解决了 https://github.com/rime/home/issues/276 中的不造词问题
  if rime_api.regex_match(incoming, "\\d") or key_event.keycode == snow.kSpace then
    for _, segment in ipairs(context.composition:toSegmentation():get_segments()) do
      if segment.status == snow.kConfirmed then
        segment.status = snow.kSelected
      end
    end
  end
  -- 取出输入中当前正在翻译的一部分
  local input = snow.current(context)
  if not input then
    return snow.kNoop
  end
  local shape_input = context:get_property("shape_input")
  if shape_input then
    input = input .. shape_input
  end
  -- 确认当前是 abc
  local segment = context.composition:toSegmentation():back()
  if not segment then
    return snow.kNoop
  end
  if not segment:has_tag("abc") then
    return snow.kNoop
  end
  -- Rime 有一个 bug，在按句号键之后的那个字词的编码的会有一个隐藏的 "."
  -- 这导致顶功判断失败，所以先屏蔽了。但是这个对用 "." 作为编码的方案会有影响
  if input == "." then
    context:pop_input(1)
    input = snow.current(context)
    if not input then
      return snow.kNoop
    end
  end
  local with_punct = false
  local preserve_case = false
  for _, rule in ipairs(env.popping) do
    local when = rule.when
    local success = false
    if when and not context:get_option(when) then
      goto continue
    end
    if rule.match_lua then
      if not input:match(rule.match_lua) then
        goto continue
      end
    elseif not rime_api.regex_match(input, rule.match) then
      goto continue
    end
    if rule.accept_lua then
      if not incoming:match(rule.accept_lua) then
        goto continue
      end
    elseif not rime_api.regex_match(incoming, rule.accept) then
      goto continue
    end
    -- 如果策略为追加编码，则不执行顶屏直接返回
    if rule.strategy == strategies.append or rule.strategy == strategies.append_raw then
      with_punct = rule.strategy == strategies.append
      preserve_case = rule.strategy == strategies.append_raw
      goto finish
      -- 如果策略为条件顶屏，那么尝试先添加编码，如果能匹配到候选就不顶屏
    elseif rule.strategy == strategies.conditional then
      context:push_input(incoming)
      if context:has_menu() then
        context:pop_input(1)
        goto finish
      end
      context:pop_input(1)
    end
    if rule.prefix then
      context:pop_input(input:len() - rule.prefix)
    end
    -- 如果当前有候选，则执行顶屏；否则顶功失败，继续执行下一个规则
    if context:has_menu() then
      -- 非缓冲时 _auto_commit 已开，confirm 这一步就会上屏
      snow.handover = 1 + (rule.prefix and input:len() - rule.prefix or 0)
      context:confirm_current_selection()
      if not buffered then
        context:commit()
      end
      snow.handover = nil
      success = true
    end
    if rule.prefix then
      context:push_input(input:sub(rule.prefix + 1))
    end
    if success then
      goto finish
    end
    ::continue::
  end
  ::finish::
  -- 除原样追加策略外，大写字母执行完顶屏功能之后转成小写
  local map = {
    [string.byte(":")] = string.byte(";"),
    [string.byte("<")] = string.byte(","),
    [string.byte(">")] = string.byte("."),
    [string.byte("?")] = string.byte("/")
  }
  if not preserve_case and key_event.keycode >= 65 and key_event.keycode <= 90 then
    key_event = KeyEvent(utf8.char(key_event.keycode + 32))
  elseif with_punct and map[key_event.keycode] then
    key_event = KeyEvent(utf8.char(map[key_event.keycode]))
  end
  snow.redispatching = true
  env.engine:process_key(key_event)
  if not buffered then
    local new_input = snow.current(context) or ""
    if rime_api.regex_match(new_input, env.auto_select_pattern) then
      context:confirm_current_selection()
      context:commit()
    end
  end
  snow.redispatching = false
  return snow.kAccepted
end

---@param env PoppingEnv
function processor.fini(env)
  env.option_connection:disconnect()
  env.commit_connection:disconnect()
end

return processor
