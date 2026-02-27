local component = require("component")
local me = component.me_interface

local mod = {}

-- 缓存上一次的 CPU 状态，用于检测变化
local lastCpuStates = {}

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
        return {
            activeItems = {},
            finalOutput = nil,
            active = false,
            busy = false,
            pendingItems = {},
            storedItems = {}
        }
    end
    
    local result = {
        activeItems = removeEmptyItem(sub.activeItems()),
        finalOutput = simpleItemInfo(sub.finalOutput()),
        active = sub.isActive(),
        busy = sub.isBusy(),
        pendingItems = removeEmptyItem(sub.pendingItems()),
        storedItems = removeEmptyItem(sub.storedItems())
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
    local cpus = me.getCpus()
    if cpus == nil then return {} end
    local result = {}
    for _, cpu in pairs(cpus) do
        local cpuId = cpu.name
        local hasChange = hasStateChanged(cpuId, cpu.busy, cpu.storage)
        
        -- 如果只请求变化的，且没有变化，则跳过
        if onlyChanged and not hasChange then
            -- 但如果 CPU 正在忙碌，仍然需要更新
            if not cpu.busy then
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
    return result
end

-- 获取单个 CPU 详情
function mod.getCpuDetail(cpuName)
    local cpus = me.getCpus()
    if cpus == nil then return nil end
    for _, cpu in pairs(cpus) do
        if cpu.name == cpuName then
            local result = getSimpleInfo(cpu)
            result.cpu = getDetailInfo(cpu)
            -- 更新缓存
            updateCachedState(cpu.name, cpu.busy, cpu.storage)
            return result
        end
    end
    return nil
end

-- 获取所有忙碌的 CPU
function mod.getBusyCpus()
    local cpus = me.getCpus()
    if cpus == nil then return {} end
    local result = {}
    for _, cpu in pairs(cpus) do
        if cpu.busy then
            local simple = getSimpleInfo(cpu)
            simple.cpu = getDetailInfo(cpu)
            table.insert(result, simple)
        end
    end
    return result
end

-- 检查是否有 CPU 正在忙碌
function mod.hasBusyCpu()
    local cpus = me.getCpus()
    if cpus == nil then return false end
    for _, cpu in pairs(cpus) do
        if cpu.busy then return true end
    end
    return false
end

-- 清除缓存
function mod.clearCache()
    lastCpuStates = {}
end

return mod