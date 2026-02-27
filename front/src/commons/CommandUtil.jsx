import HttpUtil from "../HttpUtil.jsx";

function setLastestTimestamp(timestamp) {
    localStorage.setItem("command-timestamp", timestamp)
}

function getLastestTimestamp() {
    const ts = localStorage.getItem("command-timestamp")
    return ts ? parseInt(ts, 10) : 0
}

function clearLastestTimestamp() {
    localStorage.removeItem("command-timestamp")
}

export default {
    submitCommand: (command, bodyData, callback) => {
        if (command == null || command === "") return
        let json = bodyData;
        if (typeof bodyData === 'string') {
            try {
                json = JSON.parse(bodyData)
            } catch (e) {
                console.error("Invalid JSON string passed to submitCommand", e)
                return
            }
        }
        
        // 设置时间戳，阻止数据获取直到命令处理完成
        setLastestTimestamp(Date.now())
        
        const promiss = HttpUtil.put(HttpUtil.path.task, {
            method: command,
            data: json
        })
        if (callback) {
            promiss.then(callback)
        }
        promiss.catch((e) => {
            console.error("submitCommand error:", e)
        })
    },
    canFetchData: () => {
        const currentTimestamp = Date.now()
        const latestTimestamp = getLastestTimestamp()
        // 在提交命令后的 10 秒内阻止数据获取，避免竞争条件
        // 如果时间差大于 10 秒，说明命令已处理完成，可以获取数据
        return currentTimestamp - latestTimestamp > 10000
    },
    reset: () => {
        clearLastestTimestamp()
    },
    resetNow: () => {
        setLastestTimestamp(Date.now())
    }
}
