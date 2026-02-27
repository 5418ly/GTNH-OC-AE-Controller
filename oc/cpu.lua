local component = require("component")
local me = component.me_interface

local mod = {}

-- 缓存上一次的 CPU 状态，用于检测变化
local lastCpuStates = {}

-- 调试日志函数
local function log(tag, message)
    print("[CPU][" .. tag .. "] " .. tostring(message))
end

local function logError(tag, message)
    print("[CPU][ERROR][" .. tag .. "] " .. tostring(message))
end

-- 简化物品信息
local function simpleItemInfo(item)
    if item == nil then return nil end
    return {
        name = item.name,
        label = item.label,
        damage = item.damage,
        size = item.size,
        amount = item.amount,
        aspect = item.aspect
    }
end

-- 移除空物品并简化
local function removeEmptyItem(items)
    if items == nil then return nil end

    local newOne = {}
    for _, item in pairs(items) do
        if item.size ~= nil and item.size ~= 0 or item.amount ~= nil and item.amount ~= 0 then
            table.insert(newOne, simpleItemInfo(item))
        end
    end
    return newOne
end

-- 获取 CPU 简要信息
local function getSimpleInfo(cpu)
    return {
        cpu = {},
        busy = cpu.busy,
        coprocessors = cpu.coprocessors,
        storage = cpu.storage,
        id = cpu.name
    }
end

-- 获取 CPU 详细信息
local function getDetailInfo(cpu)
    local sub = cpu.cpu
    if sub == nil then
        log("getDetailInfo", "CPU 子对象为空, cpu.name=" .. tostring(cpu.name))
        return {
            activeItems = {},
            finalOutput = nil,
            active = false,
            busy = false,
            pendingItems = {},
            storedItems = {}
        }
    end
    
    -- 安全调用方法
    local ok, activeItems = pcall(function() return sub.activeItems() end)
    if not ok then
        logError("getDetailInfo", "获取 activeItems 失败: " .. tostring(activeItems))
        activeItems = {}
    end
    
    local ok2, finalOutput = pcall(function() return sub.finalOutput() end)
    if not ok2 then
        logError("getDetailInfo", "获取 finalOutput 失败: " .. tostring(finalOutput))
        finalOutput = nil
    end
    
    local ok3, isActive = pcall(function() return sub.isActive() end)
    if not ok3 then
        logError("getDetailInfo", "获取 isActive 失败: " .. tostring(isActive))
        isActive = false
    end
    
    local ok4, isBusy = pcall(function() return sub.isBusy() end)
    if not ok4 then
        logError("getDetailInfo", "获取 isBusy 失败: " .. tostring(isBusy))
        isBusy = false
    end
    
    local ok5, pendingItems = pcall(function() return sub.pendingItems() end)
    if not ok5 then
        logError("getDetailInfo", "获取 pendingItems 失败: " .. tostring(pendingItems))
        pendingItems = {}
    end
    
    local ok6, storedItems = pcall(function() return sub.storedItems() end)
    if not ok6 then
        logError("getDetailInfo", "获取 storedItems 失败: " .. tostring(storedItems))
        storedItems = {}
    end
    
    local result = {
        activeItems = removeEmptyItem(activeItems),
        finalOutput = simpleItemInfo(finalOutput),
        active = isActive,
        busy = isBusy,
        pendingItems = removeEmptyItem(pendingItems),
        storedItems = removeEmptyItem(storedItems)
    }
    return result
end

-- 检测 CPU 状态是否有变化
local function hasStateChanged(cpuId, newBusy, newStorage)
    local lastState = lastCpuStates[cpuId]
    if lastState == nil then return true end
    return lastState.busy ~= newBusy or lastState.storage ~= newStorage
end

-- 更新缓存的状态
local function updateCachedState(cpuId, busy, storage)
    lastCpuStates[cpuId] = {
        busy = busy,
        storage = storage,
        timestamp = os.time()
    }
end

-- 获取所有 CPU 列表
-- @param detail boolean 是否获取详细信息
-- @param onlyChanged boolean 是否只返回有变化的 CPU（用于优化）
function mod.getCpuList(detail, onlyChanged)
    log("getCpuList", "开始获取, detail=" .. tostring(detail) .. ", onlyChanged=" .. tostring(onlyChanged))
    
    local ok, cpus = pcall(function() return me.getCpus() end)
    if not ok then
        logError("getCpuList", "获取CPU列表失败: " .. tostring(cpus))
        return {}
    end
    
    if cpus == nil then
        log("getCpuList", "me.getCpus() 返回 nil")
        return {}
    end
    
    local count = 0
    for _ in pairs(cpus) do count = count + 1 end
    log("getCpuList", "获取到 " .. count .. " 个CPU")
    
    local result = {}
    for _, cpu in pairs(cpus) do
        local cpuId = cpu.name
        log("getCpuList", "处理CPU: name=" .. tostring(cpuId) .. ", busy=" .. tostring(cpu.busy) .. ", storage=" .. tostring(cpu.storage))
        
        if cpuId == nil or cpuId == "" then
            log("getCpuList", "跳过无名称的CPU")
            goto continue
        end
        
        local hasChange = hasStateChanged(cpuId, cpu.busy, cpu.storage)
        
        -- 如果只请求变化的，且没有变化，则跳过
        if onlyChanged and not hasChange then
            -- 但如果 CPU 正在忙碌，仍然需要更新
            if not cpu.busy then
                log("getCpuList", "跳过无变化的CPU: " .. cpuId)
                goto continue
            end
        end
        
        local simple = getSimpleInfo(cpu)
        if detail then 
            simple.cpu = getDetailInfo(cpu) 
        end
        table.insert(result, simple)
        
        -- 更新缓存状态
        updateCachedState(cpuId, cpu.busy, cpu.storage)
        
        ::continue::
    end
    
    log("getCpuList", "返回 " .. #result .. " 个CPU")
    return result
end

-- 获取单个 CPU 详情
function mod.getCpuDetail(cpuName)
    log("getCpuDetail", "获取CPU详情: " .. tostring(cpuName))
    
    local ok, cpus = pcall(function() return me.getCpus() end)
    if not ok then
        logError("getCpuDetail", "获取CPU列表失败: " .. tostring(cpus))
        return nil
    end
    
    if cpus == nil then
        logError("getCpuDetail", "me.getCpus() 返回 nil")
        return nil
    end
    
    for _, cpu in pairs(cpus) do
        if cpu.name == cpuName then
            log("getCpuDetail", "找到CPU: " .. cpuName)
            local result = getSimpleInfo(cpu)
            result.cpu = getDetailInfo(cpu)
            -- 更新缓存
            updateCachedState(cpu.name, cpu.busy, cpu.storage)
            return result
        end
    end
    
    logError("getCpuDetail", "未找到CPU: " .. tostring(cpuName))
    return nil
end

-- 获取所有忙碌的 CPU
function mod.getBusyCpus()
    log("getBusyCpus", "开始获取忙碌的CPU")
    
    local ok, cpus = pcall(function() return me.getCpus() end)
    if not ok then
        logError("getBusyCpus", "获取CPU列表失败: " .. tostring(cpus))
        return {}
    end
    
    if cpus == nil then
        log("getBusyCpus", "me.getCpus() 返回 nil")
        return {}
    end
    
    local result = {}
    for _, cpu in pairs(cpus) do
        if cpu.busy then
            log("getBusyCpus", "找到忙碌CPU: " .. tostring(cpu.name))
            local simple = getSimpleInfo(cpu)
            simple.cpu = getDetailInfo(cpu)
            table.insert(result, simple)
        end
    end
    
    log("getBusyCpus", "返回 " .. #result .. " 个忙碌CPU")
    return result
end

-- 检查是否有 CPU 正在忙碌
function mod.hasBusyCpu()
    local ok, cpus = pcall(function() return me.getCpus() end)
    if not ok then
        logError("hasBusyCpu", "获取CPU列表失败: " .. tostring(cpus))
        return false
    end
    
    if cpus == nil then return false end
    
    for _, cpu in pairs(cpus) do
        if cpu.busy then
            log("hasBusyCpu", "发现忙碌CPU: " .. tostring(cpu.name))
            return true
        end
    end
    return false
end

-- 清除缓存
function mod.clearCache()
    log("clearCache", "清除CPU状态缓存")
    lastCpuStates = {}
end

return mod