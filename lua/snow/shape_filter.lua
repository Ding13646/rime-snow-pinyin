-- 辅助码过滤器
-- 本过滤器根据上下文中的形码输入，过滤候选词，并在候选词上显示形码提示。

local snow = require "snow.snow"

---@class ShapeFilterEnv: Env
---@field shape_elements ReverseLookup|nil
---@field shape_mapping table<string, string>
---@field encode_cache table<string, string>
---@field encode_cache_n integer
---@field chaifen_cache table<string, string>

--- 反查库加载失败时为 nil，当作查不到
---@param db ReverseLookup|nil
---@param text string
---@return string
local function lookup(db, text)
  return db and db:lookup(text) or ""
end

--- 键道的特殊处理
---@param text string
---@param current string
---@param radicals_map ReverseLookup|nil
---@param map table<string, string>
local function jiandao_encode(text, current, radicals_map, map)
  -- 把 UTF-8 编码的词语拆成单个字符的列表
  ---@type string[]
  local codes = {}
  for _, codepoint in utf8.codes(text) do
    local char = utf8.char(codepoint)
    local radicals = lookup(radicals_map, char)
    local code = ""
    for _, radical_codepoint in utf8.codes(radicals) do
      local r = utf8.char(radical_codepoint)
      local radical_code = map[r] or ""
      code = code .. radical_code
    end
    table.insert(codes, code)
  end
  if #codes == 2 and current:len() == 1 then -- 630
    return (codes[2] or "??"):sub(1, 2)
  elseif #codes == 1 then
    -- 如果只有一个字符，直接返回对应的编码
    return codes[1] or "??"
  end
  -- 普通词组取每个字的形码首码，不限制词长
  for i, code in ipairs(codes) do
    codes[i] = code:sub(1, 1)
  end
  return table.concat(codes)
end

local filter = {}

-- 形码/拆分查询缓存（按 env 隔离，避免同进程多方案共享缓存）：
-- 候选文本跨按键重复率很高；jiandao_encode 还要逐字反查。
-- key = text + "\1" + current（630 规则依赖当前码长），命中后不再走 FFI 反查。
local function cached_encode(text, current, env)
  local cache = env.encode_cache
  local key = text .. "\1" .. current
  local hit = cache[key]
  if hit ~= nil then
    return hit
  end
  local code = jiandao_encode(text, current, env.shape_elements, env.shape_mapping)
  if env.encode_cache_n >= 4096 then
    env.encode_cache = {}
    env.encode_cache_n = 0
    cache = env.encode_cache
  end
  cache[key] = code
  env.encode_cache_n = env.encode_cache_n + 1
  return code
end

local function cached_chaifen(text, env)
  local hit = env.chaifen_cache[text]
  if hit ~= nil then
    return hit
  end
  local value = lookup(env.shape_elements, text) or ""
  env.chaifen_cache[text] = value
  return value
end

---@param env ShapeFilterEnv
function filter.init(env)
  local config = env.engine.schema.config
  local dir = rime_api.get_user_data_dir() .. "/lua/snow/"
  local shape_elements = config:get_string("translator/shape_elements") or "snow_jiandao_chaifen"
  env.shape_elements = ReverseLookup(shape_elements)
  local shape_mapping = config:get_string("translator/shape_mapping") or "radical_jiandao.txt"
  env.shape_mapping = snow.table_from_tsv(dir .. shape_mapping)
  env.encode_cache, env.encode_cache_n = {}, 0
  env.chaifen_cache = {}
end

---@class ShapeFilterContext
---@field segment Segment|nil
---@field is_pinyin boolean
---@field current string
---@field shape_len integer
---@field chaifen boolean
---@field prompt string|nil
---@field jiandao_active boolean

---@param text string
---@param shape_input string
---@param env ShapeFilterEnv
---@param ctx ShapeFilterContext
function filter.handle_candidate(text, shape_input, env, ctx)
  local is_pinyin = ctx.is_pinyin
  local current = ctx.current
  if not ctx.jiandao_active then
    return true, nil, nil
  end
  local code = cached_encode(text, current, env)
  local prompt = ctx.prompt
  local match = code == "" or code:sub(1, ctx.shape_len) == shape_input
  local comment = code
  if not is_pinyin and current:len() == 1 then
    comment = "" -- 630 不需要提示
  elseif utf8.len(text) == 1 and (ctx.chaifen or is_pinyin) then
    comment = comment .. " " .. cached_chaifen(text, env)
  end
  return match, prompt, comment
end

---@param translation Translation
---@param env ShapeFilterEnv
function filter.func(translation, env)
  local context = env.engine.context
  local shape_input = context:get_property("shape_input")
  local current = snow.current(context) or ""
  local segment = context.composition:toSegmentation():back()
  local ctx = {
    segment = segment,
    is_pinyin = segment and segment:has_tag("pinyin") or false,
    current = current,
    shape_len = shape_input:len(),
    chaifen = context:get_option("chaifen"),
    prompt = shape_input:len() > 0 and (" 形 [" .. shape_input .. "]") or nil,
  }
  ctx.jiandao_active = ctx.is_pinyin or ctx.shape_len > 0
    or current:find("[BPMFDTNLGKHJQXZCSRYWE]") ~= nil
    or current:match("^[bpmfdtnlgkhjqxzcsrywe][bpmfdtnlgkhjqxzcsrywe][bpmfdtnlgkhjqxzcsrywe]?[bpmfdtnlgkhjqxzcsrywe]?$") ~= nil
  local has_candidate = false
  local has_match = false
  ---@type string?
  local first_preedit = nil
  for candidate in translation:iter() do
    has_candidate = true
    local show, prompt, comment = filter.handle_candidate(candidate.text, shape_input, env, ctx)
    if not first_preedit and prompt then
      first_preedit = candidate.preedit .. prompt
    end
    if show then
      if comment then snow.comment(candidate, comment) end
      if prompt then candidate.preedit = candidate.preedit .. prompt end
      has_match = true
      yield(candidate)
    end
  end
  if has_candidate and not has_match then
    if not segment then
      return
    end
    local candidate = Candidate("hint", segment.start, segment._end, "🈚️", "无匹配候选词")
    candidate.preedit = first_preedit or ""
    yield(candidate)
  end
end

---@param segment Segment
---@param env Env
function filter.tags_match(segment, env)
  return segment:has_tag("abc") or segment:has_tag("pinyin")
end

---@param env ShapeFilterEnv
function filter.fini(env)
  env.shape_elements = nil
  env.shape_mapping = nil
end

return filter
