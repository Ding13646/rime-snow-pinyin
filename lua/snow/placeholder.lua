-- 占位音节过滤器

local filter = {}

---@param translation Translation
---@param env Env
function filter.func(translation, env)
  for candidate in translation:iter() do
    -- 先用纯 Lua 判定占位形态：绝大多数候选不匹配，省掉逐候选 FFI 正则。
    if candidate.text:match("^%([a-z]+%d%)$")
      and candidate:get_dynamic_type() == "Phrase" then
      goto continue
    end
    yield(candidate)
    ::continue::
  end
end

-- 占位音节只出现在 snow_pinyin 词典里，笔画、标点等段无需过滤
---@param segment Segment
---@param env Env
function filter.tags_match(segment, env)
  return segment:has_tag("abc") or segment:has_tag("pinyin")
end

return filter
