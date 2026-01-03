local computer = require("computer")
local http = require("http-method")
local component = require("component")
local json = require("json")
local me = component.me_interface
local meCpu = require("cpu")
local config = require("config")

local tasks = {}
local monitors = {}

-- Helper function for chunked uploads
local function uploadChunks(path, list, mapper)
    -- 1. Clear temp data
    local _, code = http.delete(path .. "/temp")
    if code ~= 200 then
        print("Error clearing temp data at " .. path .. ": " .. tostring(code))
    end

    local batch = {}
    local batchSize = 50 -- Safe chunk size
    local count = 0

    for _, item in pairs(list) do
        local mapped = mapper(item)
        if mapped then
            table.insert(batch, mapped)
            count = count + 1
        end

        if count >= batchSize then
            local _, pCode = http.post(path .. "/batch", {}, batch)
            if pCode ~= 200 then
                print("Failed to upload batch to " .. path)
            end
            batch = {}
            count = 0
            os.sleep(0) -- Yield to prevent "too long without yielding"
        end
    end

    if count > 0 then
        local _, pCode = http.post(path .. "/batch", {}, batch)
        if pCode ~= 200 then
            print("Failed to upload final batch to " .. path)
        end
    end

    -- 2. Commit transaction
    local _, cCode = http.post(path .. "/commit", {})
    if cCode ~= 200 then
        print("Failed to commit data at " .. path .. ": " .. tostring(cCode))
    end
end

function tasks.refreshStorage(data)
    local items = me.getItemsInNetwork(data)
    uploadChunks(config.path.items, items, function(j)
        return {
            name = j.name,
            label = j.label,
            isCraftable = j.isCraftable,
            damage = j.damage,
            size = j.size,
            aspect = j.aspect
        }
    end)
end

function tasks.refreshFluidStorage(_)
    local fluids = me.getFluidsInNetwork()
    uploadChunks(config.path.fluids, fluids, function(j)
        return {
            name = j.name,
            label = j.label,
            isCraftable = j.isCraftable,
            amount = j.amount
        }
    end)
end

function tasks.refreshEssentiaStorage(_)
    local essentia = me.getEssentiaInNetwork()
    uploadChunks(config.path.essentia, essentia, function(j)
        return {
            name = j.name,
            label = j.label,
            amount = j.amount,
            aspect = j.aspect
        }
    end)
end

function tasks.requestItem(data)
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

function tasks.simpleCpusInfo(_)
    local list = meCpu.getCpuList(false)
    local _, code = http.post(config.path.cpu .. "/batch", {}, list)
    if code ~= 200 then
        print("Failed to upload simple cpu info: " .. tostring(code))
    end
end

function tasks.allCpusInfo(_)
    local list = meCpu.getCpuList(true)
    local _, code = http.post(config.path.cpu .. "/batch", {}, list)
    if code ~= 200 then
        print("Failed to upload all cpu info: " .. tostring(code))
    end
end

function tasks.cpuDetail(data)
    if data.id == nil then return "没有提供 CPU 名称" end
    local details = meCpu.getCpuDetail(data.id)
    if details == nil then return "获取 " .. data.id .. " 的信息失败！" end
    local _, code = http.post(config.path.cpu .. "/batch", {}, {details})
    if code ~= 200 then
        return "上传 CPU 详情失败: " .. tostring(code)
    end
end

function tasks.cancelMonitor(data)
    monitors[data.id] = nil
end

function tasks.monitors(_)
    local m = {}
    for key in pairs(monitors) do table.insert(m, key) end
    return "current monitors", {monitors = m}
end

function tasks.cpuMonitor(_)
    monitors.cpuMonitor = {
        data = {},
        func = function(data)
            local list = meCpu.getCpuList(true)
            local busy = false
            for _, cpu in pairs(list) do
                local flag = cpu.busy or data[cpu.id] == nil
                if cpu.id ~= nil and cpu.id ~= "" and flag then
                    http.put(config.path.cpu .. "/" .. cpu.id, {}, cpu)
                    busy = true
                    if not cpu.busy then data[cpu.id] = true end
                end
            end
            if not busy then monitors.cpuMonitor = nil end
        end
    }
end

http.init(config.baseUrl, tasks)

while true do
    for _, monitor in pairs(monitors) do monitor.func(monitor.data) end
    local result, message = http.executeNextTask(config.path.task)
    print(result, message)
    os.sleep(config.sleep)
    computer.beep(500)
end