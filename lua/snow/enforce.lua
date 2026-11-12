-- 组词规则过滤器
-- 按方案参数化声母类：键道用 flypy21 声母集，冰雪小鹤为全字母两键码

local snow = require "snow.snow"

local filter = {}

---@class EnforceSchema
---@field ini string 小写声母类
---@field up string 大写韵母类
---@field tone string|nil 小写声调尾巴类；无声调方案为 nil

---@type table<string, EnforceSchema>
local SCHEMAS = {
	snow_jiandao = { ini = "[bpmfdtnlgkhjqxzcsrywe]", up = "[BPMFDTNLGKHJQXZCSRYWE]", tone = "[vioua]" },
	snow_flypy = { ini = "[a-z]", up = "[A-Z]", tone = nil },
	snow_lx17 = { ini = "[bcdfghjlmnpqstwxyz]", up = "[BCDFGHJLMNPQSTWXYZ]", tone = nil },
	snow_gd17 = { ini = "[bcdfghjlmnpqstwxyz]", up = "[BCDFGHJLMNPQSTWXYZ]", tone = nil },
	snow_16gong = { ini = "[bcdfghklnpqrsxyz]", up = "[BCDFGHKLNQRSXYZ]", tone = nil },
}

--- 判断 preedit 是否为简拼（每个音节单字母）
---@param preedit string
---@return boolean
local function is_jianpin(preedit)
  local count = 0
  for syl in preedit:gmatch("%S+") do
    count = count + 1
    if #syl > 1 then return false end
  end
  return count > 0
end

---@param translation Translation
---@param env EnforceEnv
function filter.func(translation, env)
  local context = env.engine.context
  local input = snow.current(context) or ""
  local shape_input = context:get_property("shape_input")
  local full_input = input
  if shape_input then
    full_input = full_input .. shape_input
  end
  local schema = SCHEMAS[env.engine.schema.schema_id]
  local syl_class, ini_class, up_class, tone_class
  if schema then
    syl_class = "(" .. schema.ini .. schema.up .. "?)"
    ini_class, up_class, tone_class = schema.ini, schema.up, schema.tone
  else
    syl_class = "([a-z][A-Z]?)"
    ini_class, up_class, tone_class = "[a-z]", "[A-Z]", nil
  end
  local jianpin = input:gsub(syl_class, "%1 "):sub(1, -2)
  local shuangpin = input:gsub("(..)", "%1 "):sub(1, -2)
  local tone_tail = tone_class or ""

  -- 获取当前是否为部分选中状态（非首字，带 nil 保护）
  local segment = context.composition:toSegmentation():back()
  local is_not_first = segment and segment.start ~= 0 or false

  -- 整句模式下，不允许：
  -- 1. 整句简拼组句
  -- 2. 部分选中后的简拼
  -- 3. 字数少于音码数的简拼
  if not context:get_option("popping") then
    -- 简拼音码数：按声母计数（大写韵母不另起音节）
    local yin_count = select(2, jianpin:gsub("%S+", ""))

    for candidate in translation:iter() do
      local preedit = rime_api.regex_replace(candidate.preedit, " 形.+$", "")
      local is_sentence = candidate:get_dynamic_type() == "Sentence"
      local char_count = utf8.len(candidate.text)
      local jp = is_jianpin(preedit)

      local filter_it = (is_sentence and preedit == jianpin)
        or (jp and (is_not_first or char_count < yin_count))

      -- 例外放行：首字、且词库中真实存在的合法简拼词（字数 >= 音码数）
      if filter_it and not is_not_first and not is_sentence
        and preedit == jianpin and char_count >= yin_count then
        filter_it = false
      end

      if not filter_it then
        yield(candidate)
      end
    end
    return
  end

  local mixed_spelling = input:find(up_class) ~= nil
  local is_shuangpin = not mixed_spelling
    and full_input:match("^" .. ini_class .. ini_class .. tone_tail .. "*$") ~= nil
  local is_four = not mixed_spelling
    and full_input:match("^" .. ini_class .. ini_class .. ini_class .. ini_class .. tone_tail .. "*$") ~= nil
  for candidate in translation:iter() do
    -- 同段原生翻译结果按消耗长度降序排列。简拼只接受完整编码，遇到短候选即可结束，
    -- 不必逐个生成 preedit 再丢弃整批前缀词；四码仍保留单字，供选择造词使用。
    if not is_four and candidate._end - candidate._start < input:len() then
      return
    end
    local dynamic_type = candidate:get_dynamic_type()
    local is_phrase = dynamic_type == "Phrase" or dynamic_type == "Sentence"
    -- 单字/非词组候选无论拼写形式都放行：先 yield，省掉 preedit 处理与 FFI 正则。
    if not is_phrase then
      yield(candidate)
      goto continue
    end
    local preedit = candidate.preedit:gsub(" 形.+$", "")
    local is_normal_spelling
    if mixed_spelling then
      -- 大写韵母与前一个声母构成同一音节，仅用于三字及以上词
      is_normal_spelling = preedit == jianpin and utf8.len(candidate.text) >= 3
    elseif is_shuangpin then
      -- 两码时一定是双拼
      is_normal_spelling = preedit == shuangpin
    elseif is_four then
      -- 四码时可能是双拼，也可能是简拼
      is_normal_spelling = preedit == jianpin or preedit == shuangpin
        or (utf8.len(candidate.text) == 1 and preedit:len() == 2)
    else
      -- 其他情况是简拼
      is_normal_spelling = preedit == jianpin
    end
    if is_normal_spelling then
      yield(candidate)
    end
    ::continue::
  end
end

---@class EnforceEnv: Env

---@param segment Segment
---@param env Env
function filter.tags_match(segment, env)
  return segment:has_tag("abc")
end

return filter