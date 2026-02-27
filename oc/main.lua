local computer = require("computer")
local http = require("http-method")
local component = require("component")
local json = require("json")
local me = component.me_interface
local meCpu = require("cpu")
local config = require("config")

local tasks = {}
local monitors = {}

-- 配置
local CPU_MONITOR_INTERVAL = 2  -- CPU 监控间隔（秒）
local TASK_CHECK_INTERVAL = 1   -- 任务检查间隔（秒）
local ITEMS_BATCH_SIZE = 500    -- 物品分批处理大小
local ITEMS_BATCH_DELAY = 0.1   -- 批次之间的延迟（秒）

-- 调试日志函数
local function log(tag, message)
    print("[" .. tag .. "] " .. tostring(message))
end

local function logError(tag, message)
    print("[ERROR][" .. tag .. "] " .. tostring(message))
end

local function logTable(tag, t, maxDepth)
    maxDepth = maxDepth or 2
    if maxDepth <= 0 then
        log(tag, "...")
        return
    end
    
    if type(t) ~= "table" then
        log(tag, tostring(t))
        return
    end
    
    for k, v in pairs(t) do
        if type(v) == "table" then
            log(tag, tostring(k) .. " = {")
            logTable(tag, v, maxDepth - 1)
            log(tag, "}")
        else
            log(tag, tostring(k) .. " = " .. tostring(v))
        end
    end
end

-- ============================================
-- 辅助函数
-- ============================================

-- 分批发送数据到后端
local function sendBatch(endpoint, batch, batchIndex, totalBatches)
    log("sendBatch", "发送批次 " .. batchIndex .. "/" .. totalBatches .. " 到 " .. endpoint .. " (物品数: " .. #batch .. ")")
    local payload = {
        result = batch,
        batch = batchIndex,
        totalBatches = totalBatches
    }
    local ok, err = pcall(function() http.put(endpoint, {}, payload) end)
    if not ok then
        logError("sendBatch", "发送失败: " .. tostring(err))
    end
end

-- 安全获取物品（带内存检查）
local function safeGetItems(filter, maxItems)
    maxItems = maxItems or 10000  -- 默认最大物品数
    
    log("safeGetItems", "开始获取物品, maxItems=" .. maxItems)
    
    -- 先尝试获取物品
    local ok, items = pcall(function() return me.getItemsInNetwork(filter) end)
    if not ok then
        logError("safeGetItems", "获取物品失败: " .. tostring(items))
        return nil, "获取物品失败: " .. tostring(items)
    end
    
    if not items then
        log("safeGetItems", "返回空结果")
        return {}, nil
    end
    
    -- 检查数量
    local count = 0
    for _ in pairs(items) do
        count = count + 1
        if count > maxItems then
            logError("safeGetItems", "物品数量超过限制: " .. count)
            return nil, "物品数量超过限制 (" .. maxItems .. ")"
        end
    end
    
    log("safeGetItems", "获取到 " .. count .. " 个物品")
    return items, nil
end

-- ============================================
-- 任务处理函数
-- ============================================

function tasks.refreshStorage(data)
    log("refreshStorage", "开始执行, data=" .. json.encode(data or {}))
    
    -- data 是物品过滤表
    -- 支持的参数:
    --   data.isCraftable: 是否只获取可合成物品 (true/false/nil)
    --   data.batchSize: 每批处理的物品数量 (默认 500)
    --   data.maxItems: 最大物品数量限制 (默认 10000)
    
    local filter = data or {}
    local batchSize = filter.batchSize or ITEMS_BATCH_SIZE
    local maxItems = filter.maxItems or 10000
    
    -- 移除非过滤参数
    filter.batchSize = nil
    filter.maxItems = nil
    
    log("refreshStorage", "batchSize=" .. batchSize .. ", maxItems=" .. maxItems)
    
    local items, err = safeGetItems(filter, maxItems)
    if err then
        logError("refreshStorage", err)
        return "错误: " .. err, nil
    end
    
    if not items then
        log("refreshStorage", "没有物品")
        http.put(config.path.items, {}, {result = {}, batch = 1, totalBatches = 1})
        return "没有找到物品", {count = 0}
    end
    
    -- 计算总批次数
    local totalCount = 0
    for _ in pairs(items) do
        totalCount = totalCount + 1
    end
    
    log("refreshStorage", "总物品数: " .. totalCount)
    
    if totalCount == 0 then
        log("refreshStorage", "物品数量为0")
        http.put(config.path.items, {}, {result = {}, batch = 1, totalBatches = 1})
        return "没有找到物品", {count = 0}
    end
    
    local totalBatches = math.ceil(totalCount / batchSize)
    
    -- 分批处理
    local batch = {}
    local batchIndex = 0
    local processedCount = 0
    
    for _, j in pairs(items) do
        table.insert(batch, {
            name = j.name,
            label = j.label,
            isCraftable = j.isCraftable,
            damage = j.damage,
            size = j.size,
            aspect = j.aspect
        })
        
        processedCount = processedCount + 1
        
        -- 当批次满了，发送数据
        if #batch >= batchSize then
            batchIndex = batchIndex + 1
            sendBatch(config.path.items, batch, batchIndex, totalBatches)
            batch = {}
            
            -- 让出 CPU，避免卡死
            os.sleep(ITEMS_BATCH_DELAY)
        end
    end
    
    -- 发送最后一批
    if #batch > 0 then
        batchIndex = batchIndex + 1
        sendBatch(config.path.items, batch, batchIndex, totalBatches)
    end
    
    log("refreshStorage", "完成, 处理了 " .. processedCount .. " 个物品, " .. batchIndex .. " 批次")
    return "物品信息已更新", {count = processedCount, batches = batchIndex}
end

-- 增量更新物品（只更新变化的部分）
function tasks.refreshStorageIncremental(data)
    log("refreshStorageIncremental", "开始执行")
    
    -- 增量更新，只获取指定范围的物品
    -- data.offset: 起始偏移
    -- data.limit: 数量限制
    
    local filter = data.filter or {}
    local offset = data.offset or 0
    local limit = data.limit or 500
    
    local items, err = safeGetItems(filter, limit + offset + 1000)
    if err then
        return "错误: " .. err, nil
    end
    
    local result = {}
    local count = 0
    local skipped = 0
    
    for _, j in pairs(items) do
        if skipped >= offset then
            table.insert(result, {
                name = j.name,
                label = j.label,
                isCraftable = j.isCraftable,
                damage = j.damage,
                size = j.size,
                aspect = j.aspect
            })
            count = count + 1
            if count >= limit then
                break
            end
        else
            skipped = skipped + 1
        end
    end
    
    http.put(config.path.items, {}, {result = result, offset = offset, limit = limit})
    
    return "增量更新完成", {count = count}
end

function tasks.refreshFluidStorage(_)
    log("refreshFluidStorage", "开始执行")
    
    -- 刷新流体库存
    local fluids = me.getFluidsInNetwork()
    local result = {}

    for _, j in pairs(fluids) do
        table.insert(result, {
            name = j.name,
            label = j.label,
            isCraftable = j.isCraftable,
            amount = j.amount
        })
    end

    log("refreshFluidStorage", "获取到 " .. #result .. " 个流体")
    http.put(config.path.fluids, {}, {result = result})
    return "流体信息已更新", {count = #result}
end

function tasks.refreshEssentiaStorage(_)
    log("refreshEssentiaStorage", "开始执行")
    
    -- 刷新原质库存
    local fluids = me.getEssentiaInNetwork()
    local result = {}

    for _, j in pairs(fluids) do
        table.insert(result, {
            name = j.name,
            label = j.label,
            amount = j.amount,
            aspect = j.aspect
        })
    end

    log("refreshEssentiaStorage", "获取到 " .. #result .. " 个原质")
    http.put(config.path.essentia, {}, {result = result})
    return "原质信息已更新", {count = #result}
end

function tasks.requestItem(data)
    log("requestItem", "开始执行: " .. json.encode(data or {}))
    
    -- 请求制作物品
    if data.filter == nil then data.filter = {} end

    local craftable = me.getCraftables(data.filter)[1]
    if craftable == nil then 
        logError("requestItem", "没有指定的物品: " .. json.encode(data.filter))
        return "没有指定的物品: " .. json.encode(data.filter) 
    end
    if data.amount == nil then data.amount = 1 end

    local result
    if data.cpuName ~= nil then
        if data.prioritizePower == nil then data.prioritizePower = true end
        result = craftable.request(data.amount, data.prioritizePower, data.cpuName)
    elseif data.prioritizePower ~= nil then
        result = craftable.request(data.amount, data.prioritizePower)
    else
        result = craftable.request(data.amount)
    end
    if result == nil then 
        logError("requestItem", "请求制造物品失败")
        return "请求制造物品失败！", nil 
    end

    local res = {
        item = craftable.getItemStack(),
        failed = result.hasFailed(),
        computing = result.isComputing(),
        done = {result = true, why = nil},
        canceled = {result = true, why = nil}
    }
    res.done.result, res.done.why = result.isDone()
    res.canceled.result, res.canceled.why = result.isCanceled()
    log("requestItem", "请求成功")
    return "请求制造物品完成", res
end

-- ============================================
-- CPU 相关任务
-- ============================================

function tasks.simpleCpusInfo(_)
    log("simpleCpusInfo", "开始执行")
    
    -- 获取所有 CPU 的简要信息
    local ok, list = pcall(function() return meCpu.getCpuList(false) end)
    if not ok then
        logError("simpleCpusInfo", "获取CPU列表失败: " .. tostring(list))
        return "获取CPU列表失败: " .. tostring(list), nil
    end
    
    log("simpleCpusInfo", "获取到 " .. #list .. " 个CPU")
    
    for _, cpu in pairs(list) do
        log("simpleCpusInfo", "CPU: id=" .. tostring(cpu.id) .. ", busy=" .. tostring(cpu.busy))
        if cpu.id ~= nil and cpu.id ~= "" then
            -- 只使用 PUT 更新，不创建新记录
            local putOk, putErr = pcall(function() http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu) end)
            if not putOk then
                logError("simpleCpusInfo", "更新CPU " .. tostring(cpu.id) .. " 失败: " .. tostring(putErr))
            end
        end
    end
    return "CPU 简要信息已更新", {count = #list}
end

function tasks.allCpusInfo(_)
    log("allCpusInfo", "开始执行")
    
    -- 获取所有 CPU 的详细信息
    local ok, list = pcall(function() return meCpu.getCpuList(true) end)
    if not ok then
        logError("allCpusInfo", "获取CPU列表失败: " .. tostring(list))
        return "获取CPU列表失败: " .. tostring(list), nil
    end
    
    log("allCpusInfo", "获取到 " .. #list .. " 个CPU")
    
    for _, cpu in pairs(list) do
        log("allCpusInfo", "CPU: id=" .. tostring(cpu.id) .. ", busy=" .. tostring(cpu.busy))
        if cpu.id ~= nil and cpu.id ~= "" then
            -- 只使用 PUT 更新，不创建新记录
            local putOk, putErr = pcall(function() http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu) end)
            if not putOk then
                logError("allCpusInfo", "更新CPU " .. tostring(cpu.id) .. " 失败: " .. tostring(putErr))
            end
        end
    end
    return "CPU 详细信息已更新", {count = #list}
end

function tasks.cpuDetail(data)
    log("cpuDetail", "开始执行: " .. json.encode(data or {}))
    
    -- 获取单个 CPU 的详细信息
    if data.id == nil then 
        logError("cpuDetail", "没有提供 CPU 名称")
        return "没有提供 CPU 名称" 
    end
    
    local ok, details = pcall(function() return meCpu.getCpuDetail(data.id) end)
    if not ok then
        logError("cpuDetail", "获取 " .. data.id .. " 的信息失败: " .. tostring(details))
        return "获取 " .. data.id .. " 的信息失败！" 
    end
    
    if details == nil then 
        logError("cpuDetail", "获取 " .. data.id .. " 的信息返回nil")
        return "获取 " .. data.id .. " 的信息失败！" 
    end
    
    http.put(config.path.cpu .. "/" .. data.id, {}, details)
    log("cpuDetail", "CPU " .. data.id .. " 详情已更新")
    return "CPU 详情已更新", {id = data.id}
end

-- ============================================
-- 监控相关
-- ============================================

function tasks.cancelMonitor(data)
    log("cancelMonitor", "开始执行: " .. json.encode(data or {}))
    
    -- 取消监控
    if data.id == nil then
        -- 取消所有监控
        monitors = {}
        return "已取消所有监控"
    end
    monitors[data.id] = nil
    return "已取消监控: " .. data.id
end

function tasks.monitors(_)
    -- 列出当前所有监控
    local m = {}
    for key in pairs(monitors) do 
        table.insert(m, key) 
    end
    return "当前监控列表", {monitors = m}
end

function tasks.cpuMonitor(data)
    log("cpuMonitor", "开始执行: " .. json.encode(data or {}))
    
    -- 添加 CPU 监控器
    -- 可选参数:
    --   data.interval: 监控间隔（秒），默认 2
    --   data.detail: 是否获取详细信息，默认 true
    
    local interval = data.interval or CPU_MONITOR_INTERVAL
    local detail = data.detail ~= false  -- 默认为 true
    
    monitors.cpuMonitor = {
        data = {
            lastUpdate = 0,
            interval = interval,
            detail = detail
        },
        func = function(monitorData)
            local currentTime = computer.uptime()
            
            -- 检查是否到达更新时间
            if currentTime - monitorData.lastUpdate < monitorData.interval then
                return
            end
            monitorData.lastUpdate = currentTime
            
            -- 获取所有 CPU 信息
            local ok, list = pcall(function() return meCpu.getCpuList(monitorData.detail) end)
            if not ok then
                logError("cpuMonitor", "获取CPU列表失败: " .. tostring(list))
                return
            end
            
            for _, cpu in pairs(list) do
                if cpu.id ~= nil and cpu.id ~= "" then
                    http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                end
            end
        end
    }
    
    return "CPU 监控已启动", {interval = interval, detail = detail}
end

-- 智能监控：只在有 CPU 忙碌时才更新
function tasks.smartCpuMonitor(data)
    log("smartCpuMonitor", "开始执行: " .. json.encode(data or {}))
    
    local interval = data.interval or CPU_MONITOR_INTERVAL
    
    monitors.smartCpuMonitor = {
        data = {
            lastUpdate = 0,
            interval = interval,
            wasBusy = false
        },
        func = function(monitorData)
            local currentTime = computer.uptime()
            
            -- 检查是否有忙碌的 CPU
            local ok, hasBusy = pcall(function() return meCpu.hasBusyCpu() end)
            if not ok then
                logError("smartCpuMonitor", "检查CPU状态失败: " .. tostring(hasBusy))
                return
            end
            
            -- 如果之前忙碌但现在不忙碌了，发送一次最终更新
            if monitorData.wasBusy and not hasBusy then
                local ok2, list = pcall(function() return meCpu.getCpuList(false) end)
                if ok2 and list then
                    for _, cpu in pairs(list) do
                        if cpu.id ~= nil and cpu.id ~= "" then
                            http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                        end
                    end
                end
                monitorData.wasBusy = false
                return
            end
            
            -- 如果没有忙碌的 CPU，跳过更新
            if not hasBusy then
                return
            end
            
            monitorData.wasBusy = true
            
            -- 检查是否到达更新时间
            if currentTime - monitorData.lastUpdate < monitorData.interval then
                return
            end
            monitorData.lastUpdate = currentTime
            
            -- 只更新忙碌的 CPU
            local ok3, busyCpus = pcall(function() return meCpu.getBusyCpus() end)
            if not ok3 then
                logError("smartCpuMonitor", "获取忙碌CPU失败: " .. tostring(busyCpus))
                return
            end
            
            if busyCpus then
                for _, cpu in pairs(busyCpus) do
                    if cpu.id ~= nil and cpu.id ~= "" then
                        http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                    end
                end
            end
        end
    }
    
    return "智能 CPU 监控已启动", {interval = interval}
end

-- ============================================
-- 内存状态
-- ============================================

function tasks.memoryStatus(_)
    -- 返回当前内存使用情况
    local free = computer.freeMemory()
    local total = computer.totalMemory()
    local used = total - free
    
    log("memoryStatus", "free=" .. free .. ", total=" .. total .. ", used=" .. used)
    
    return "内存状态", {
        free = free,
        total = total,
        used = used,
        usedPercent = math.floor(used / total * 100)
    }
end

-- ============================================
-- 主循环
-- ============================================

-- 初始化 HTTP 客户端
log("INIT", "初始化 HTTP 客户端")
http.init(config.baseUrl, tasks)

-- 启动时自动开始 CPU 监控
log("INIT", "启动 CPU 自动监控...")
tasks.smartCpuMonitor({interval = 2})

log("INIT", "OC-AE 控制器已启动")
log("INIT", "配置: sleep=" .. config.sleep .. "s, baseUrl=" .. config.baseUrl)
log("INIT", "内存: " .. math.floor(computer.freeMemory() / 1024) .. "KB / " .. math.floor(computer.totalMemory() / 1024) .. "KB")

-- 测试 ME 接口连接
local ok, result = pcall(function() return me.getItemsInNetwork({}) end)
if ok then
    local count = 0
    if result then
        for _ in pairs(result) do count = count + 1 end
    end
    log("INIT", "ME 接口测试成功, 物品数: " .. count)
else
    logError("INIT", "ME 接口测试失败: " .. tostring(result))
end

-- 测试 CPU 获取
local ok2, cpus = pcall(function() return meCpu.getCpuList(false) end)
if ok2 then
    log("INIT", "CPU 列表测试成功, CPU数: " .. (cpus and #cpus or 0))
else
    logError("INIT", "CPU 列表测试失败: " .. tostring(cpus))
end

while true do
    -- 执行所有监控器
    for name, monitor in pairs(monitors) do 
        local ok, err = pcall(monitor.func, monitor.data)
        if not ok then
            logError("MONITOR", name .. " 执行错误: " .. tostring(err))
        end
    end
    
    -- 执行任务
    local result, message = http.executeNextTask(config.path.task)
    if result ~= http.TASK.NO_TASK then
        log("TASK", result .. ": " .. tostring(message))
    end
    
    -- 休眠
    os.sleep(config.sleep or 1)
    
    -- 可选：发出提示音
    -- computer.beep(500)
end