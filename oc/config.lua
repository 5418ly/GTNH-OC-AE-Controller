return {
    sleep = 10,                     -- 两次执行任务时间隔多少秒
    token = "token",                -- token
    baseUrl = "https://123456",     -- 基础 url
    path = {                        -- 各项数据路径
        task = "/task",             -- 任务数据所在路径
        cpu = "/api/v2/cpus",       -- cpu V2
        essentia = "/api/v2/essentia",     -- 源质 V2
        fluids = "/api/v2/fluids",         -- 流体 V2
        items = "/api/v2/items"            -- 物品 V2
    }
}
