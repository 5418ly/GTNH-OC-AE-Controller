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

-- ============================================
-- 辅助函数
-- ============================================

-- 分批发送数据到后端
local function sendBatch(endpoint, batch, batchIndex, totalBatches)
    local payload = {
        result = batch,
        batch = batchIndex,
        totalBatches = totalBatches
    }
    http.put(endpoint, {}, payload)
end

-- 安全获取物品（带内存检查）
local function safeGetItems(filter, maxItems)
    maxItems = maxItems or 10000  -- 默认最大物品数
    
    -- 先尝试获取物品
    local ok, items = pcall(function() return me.getItemsInNetwork(filter) end)
    if not ok then
        return nil, "获取物品失败: " .. tostring(items)
    end
    
    if not items then
        return {}, nil
    end
    
    -- 检查数量
    local count = 0
    for _ in pairs(items) do
        count = count + 1
        if count > maxItems then
            return nil, "物品数量超过限制 (" .. maxItems .. ")"
        end
    end
    
    return items, nil
end

-- ============================================
-- 任务处理函数
-- ============================================

function tasks.refreshStorage(data)
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
    
    local items, err = safeGetItems(filter, maxItems)
    if err then
        return "错误: " .. err, nil
    end
    
    if not items or #items == 0 then
        http.put(config.path.items, {}, {result = {}, batch = 1, totalBatches = 1})
        return "没有找到物品", {count = 0}
    end
    
    -- 计算总批次数
    local totalCount = 0
    for _ in pairs(items) do
        totalCount = totalCount + 1
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
            
            -- 手动触发垃圾回收
            if batchIndex % 5 == 0 then
                collectgarbage("collect")
            end
        end
    end
    
    -- 发送最后一批
    if #batch > 0 then
        batchIndex = batchIndex + 1
        sendBatch(config.path.items, batch, batchIndex, totalBatches)
    end
    
    -- 强制垃圾回收
    collectgarbage("collect")
    
    return "物品信息已更新", {count = processedCount, batches = batchIndex}
end

-- 增量更新物品（只更新变化的部分）
function tasks.refreshStorageIncremental(data)
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

    http.put(config.path.fluids, {}, {result = result})
    return "流体信息已更新", {count = #result}
end

function tasks.refreshEssentiaStorage(_)
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

    http.put(config.path.essentia, {}, {result = result})
    return "原质信息已更新", {count = #result}
end

function tasks.requestItem(data)
    -- 请求制作物品
    if data.filter == nil then data.filter = {} end

    local craftable = me.getCraftables(data.filter)[1]
    if craftable == nil then return "没有指定的物品: " .. json.encode(data.filter) end
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
    if result == nil then return "请求制造物品失败！", nil end

    local res = {
        item = craftable.getItemStack(),
        failed = result.hasFailed(),
        computing = result.isComputing(),
        done = {result = true, why = nil},
        canceled = {result = true, why = nil}
    }
    res.done.result, res.done.why = result.isDone()
    res.canceled.result, res.canceled.why = result.isCanceled()
    return "请求制造物品完成", res
end

-- ============================================
-- CPU 相关任务
-- ============================================

function tasks.simpleCpusInfo(_)
    -- 获取所有 CPU 的简要信息
    local list = meCpu.getCpuList(false)
    for _, cpu in pairs(list) do
        if cpu.id ~= nil and cpu.id ~= "" then
            -- 只使用 PUT 更新，不创建新记录
            http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
        end
    end
    return "CPU 简要信息已更新", {count = #list}
end

function tasks.allCpusInfo(_)
    -- 获取所有 CPU 的详细信息
    local list = meCpu.getCpuList(true)
    for _, cpu in pairs(list) do
        if cpu.id ~= nil and cpu.id ~= "" then
            -- 只使用 PUT 更新，不创建新记录
            http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
        end
    end
    return "CPU 详细信息已更新", {count = #list}
end

function tasks.cpuDetail(data)
    -- 获取单个 CPU 的详细信息
    if data.id == nil then return "没有提供 CPU 名称" end
    local details = meCpu.getCpuDetail(data.id)
    if details == nil then return "获取 " .. data.id .. " 的信息失败！" end
    http.put(config.path.cpu .. "/" .. data.id, {}, details)
    return "CPU 详情已更新", {id = data.id}
end

-- ============================================
-- 监控相关
-- ============================================

function tasks.cancelMonitor(data)
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
            local list = meCpu.getCpuList(monitorData.detail)
            
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
            local hasBusy = meCpu.hasBusyCpu()
            
            -- 如果之前忙碌但现在不忙碌了，发送一次最终更新
            if monitorData.wasBusy and not hasBusy then
                local list = meCpu.getCpuList(false)
                for _, cpu in pairs(list) do
                    if cpu.id ~= nil and cpu.id ~= "" then
                        http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
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
            local busyCpus = meCpu.getBusyCpus()
            for _, cpu in pairs(busyCpus) do
                if cpu.id ~= nil and cpu.id ~= "" then
                    http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
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
http.init(config.baseUrl, tasks)

-- 启动时自动开始 CPU 监控
print("启动 CPU 自动监控...")
tasks.smartCpuMonitor({interval = 2})

print("OC-AE 控制器已启动")
print("配置: sleep=" .. config.sleep .. "s, baseUrl=" .. config.baseUrl)
print("内存: " .. math.floor(computer.freeMemory() / 1024) .. "KB / " .. math.floor(computer.totalMemory() / 1024) .. "KB")

while true do
    -- 执行所有监控器
    for name, monitor in pairs(monitors) do 
        local ok, err = pcall(monitor.func, monitor.data)
        if not ok then
            print("监控器 " .. name .. " 执行错误: " .. tostring(err))
        end
    end
    
    -- 执行任务
    local result, message = http.executeNextTask(config.path.task)
    if result ~= http.TASK.NO_TASK then
        print(result, message)
    end
    
    -- 定期垃圾回收
    collectgarbage("step")
    
    -- 休眠
    os.sleep(config.sleep or 1)
    
    -- 可选：发出提示音
    -- computer.beep(500)
end