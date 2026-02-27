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

-- ============================================
-- 任务处理函数
-- ============================================

function tasks.refreshStorage(data)
    -- data 是物品过滤表
    local item = me.getItemsInNetwork(data)
    local result = {}

    for _, j in pairs(item) do
        table.insert(result, {
            name = j.name,
            label = j.label,
            isCraftable = j.isCraftable,
            damage = j.damage,
            size = j.size,
            aspect = j.aspect
        })
    end

    http.put(config.path.items, {}, {result = result})
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
            local _, code = http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
            if code ~= 200 then
                http.post(config.path.cpu, {}, cpu)
            end
        end
    end
    return "CPU 简要信息已更新", {count = #list}
end

function tasks.allCpusInfo(_)
    -- 获取所有 CPU 的详细信息
    local list = meCpu.getCpuList(true)
    for _, cpu in pairs(list) do
        if cpu.id ~= nil and cpu.id ~= "" then
            local _, code = http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
            if code ~= 200 then
                http.post(config.path.cpu, {}, cpu)
            end
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
            local hasBusy = false
            
            for _, cpu in pairs(list) do
                if cpu.id ~= nil and cpu.id ~= "" then
                    -- 总是更新忙碌的 CPU
                    if cpu.busy then
                        hasBusy = true
                        http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                    else
                        -- 空闲的 CPU 也更新，但频率可以降低
                        http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                    end
                end
            end
            
            -- 如果没有忙碌的 CPU，可以选择停止监控
            -- 但为了保持数据同步，我们继续监控
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
-- 主循环
-- ============================================

-- 初始化 HTTP 客户端
http.init(config.baseUrl, tasks)

-- 启动时自动开始 CPU 监控
print("启动 CPU 自动监控...")
tasks.smartCpuMonitor({interval = 2})

print("OC-AE 控制器已启动")
print("配置: sleep=" .. config.sleep .. "s, baseUrl=" .. config.baseUrl)

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
    
    -- 休眠
    os.sleep(config.sleep or 1)
    
    -- 可选：发出提示音
    -- computer.beep(500)
end