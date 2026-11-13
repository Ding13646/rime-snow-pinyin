-- 声声词：两键后按引号(')或 Tab 直接上屏二字词（自声笔飞码/飞单移植）
-- 词表: 用户目录下 <schema_id>_ss.txt，每行 "码\t词语"；
--   码为 1-4 个声母键，引号与 Tab 等效，均可上屏；
--   声母键与各方案单字/二简打法一致（韵母感知飞键，详见词表头注释）
-- 处理器: 两码状态按引号或 Tab，词表命中即直接上屏该词，未命中回落原有按键行为
-- 过滤器: 命中词表时在首选候选上追加 "词语'" 注释，提示按引号或 Tab 将上屏的词

local snow = require "snow.snow"

local ss = {}

---@class SsSchema
---@field file string
---@field initials string
---@field require_popping boolean

---@type table<string, SsSchema>
local SCHEMAS = {
	snow_flypy = { file = "snow_flypy_ss.txt", initials = "abcdefghijklmnopqrstuvwxyz", require_popping = false },
}

---@class SsEnv: Env
---@field words table<string, string>
---@field initials table<integer, boolean>
---@field require_popping boolean

local initial_sets = {}
local word_tables = {}

---@param initials string
---@return table<integer, boolean>
local function initial_set(initials)
	local set = initial_sets[initials]
	if not set then
		set = {}
		for letter in initials:gmatch(".") do
			set[letter:byte()] = true
		end
		initial_sets[initials] = set
	end
	return set
end

---@param file string
---@return table<string, string>
local function load_words(file)
	local words = word_tables[file]
	if words then
		return words
	end
	words = {}
	local path = rime_api.get_user_data_dir() .. "/" .. file
	local handle = io.open(path, "r")
	if handle then
		for line in handle:lines() do
			local code, word = line:match("([^\t]+)\t([^\t]+)")
			-- 兼容历史格式：码尾的引号去掉，引号与 Tab 查同一张表
			if code and word then
				code = code:gsub("'$", "")
				if #code >= 1 and #code <= 4 and not words[code] then
					-- 文件按词频降序排列，同码时排在前面（高频）的词生效
					words[code] = word
				end
			end
		end
		handle:close()
	end
	word_tables[file] = words
	return words
end

---@param input string
---@param set table<integer, boolean>
---@return boolean
local function is_initials(input, set)
	if #input == 0 or #input > 4 then
		return false
	end
	for i = 1, #input do
		if not set[input:byte(i)] then
			return false
		end
	end
	return true
end

---取当前输入对应的声声词；任何前置条件不满足都返回 nil，让按键走原有行为
---@param env SsEnv
---@return string|nil
local function active_word(env)
	local context = env.engine.context
	-- 声声词开关关闭时，引号与 Tab 保持原有行为
	if not context:get_option("ss") then
		return nil
	end
	-- 自由加词过程中不劫持按键
	if context:get_option("add") then
		return nil
	end
	-- 键道仅顶功模式启用；整句模式下两码可能是句中音节，按键应保持原有语义
	if env.require_popping and not context:get_option("popping") then
		return nil
	end
	-- 辅助码输入中不劫持
	local shape_input = context:get_property("shape_input")
	if shape_input and shape_input ~= "" then
		return nil
	end
	local input = snow.current(context)
	if not input or not is_initials(input, env.initials) then
		return nil
	end
	local segment = context.composition:toSegmentation():back()
	-- 反查/命令引导段（小鹤声声词码与小写引导组合共存）同样放行
	if not segment or not (segment:has_tag("abc") or segment:has_tag("pinyin")
			or segment:has_tag("stroke") or segment:has_tag("lua")) then
		return nil
	end
	return env.words[input]
end

ss.processor = {}

---@param env SsEnv
function ss.processor.init(env)
	local config = SCHEMAS[env.engine.schema.schema_id]
	if not config then
		env.words = {}
		env.initials = initial_set("")
		env.require_popping = false
		return
	end
	env.words = load_words(config.file)
	env.initials = initial_set(config.initials)
	env.require_popping = config.require_popping
end

---@param key_event KeyEvent
---@param env SsEnv
function ss.processor.func(key_event, env)
	-- 任何意外错误都退回 kNoop，绝不打断正常输入
	local ok, result = pcall(function()
		if snow.redispatching then
			return snow.kNoop
		end
		if key_event:release() or key_event:alt() or key_event:ctrl() or key_event:caps() then
			return snow.kNoop
		end
		local is_quote = utf8.char(key_event.keycode) == "'"
		local is_tab = key_event.keycode == snow.kTab
		if not is_quote and not is_tab then
			return snow.kNoop
		end
		local word = active_word(env)
		if not word then
			return snow.kNoop
		end
		snow.handover = 1
		snow.commit_text(env.engine, word)
		snow.handover = nil
		env.engine.context:clear()
		return snow.kAccepted
	end)
	if not ok then
		snow.errorf("ss processor: %s", result)
		return snow.kNoop
	end
	return result
end

ss.filter = {}

---@param env SsEnv
function ss.filter.init(env)
	local config = SCHEMAS[env.engine.schema.schema_id]
	if not config then
		env.words = {}
		env.initials = initial_set("")
		env.require_popping = false
		return
	end
	env.words = load_words(config.file)
	env.initials = initial_set(config.initials)
	env.require_popping = config.require_popping
end

---@param translation Translation
---@param env SsEnv
function ss.filter.func(translation, env)
	-- yield 不能跨越 pcall，只包住前置判断部分
	local ok, word = pcall(active_word, env)
	if not ok then
		word = nil
	end
	local first = true
	for candidate in translation:iter() do
		if word and first then
			-- 不管首选是否就是声声词，都显示提示
			snow.comment(candidate, word .. "'")
			first = false
		end
		yield(candidate)
	end
end

return ss
