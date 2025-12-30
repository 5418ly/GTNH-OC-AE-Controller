import HttpUtil from "../HttpUtil.jsx";

function setLastestTimestamp(timestamp) {
    localStorage.setItem("command-timestamp", timestamp)
}

function getLastestTimestamp() {
    return localStorage.getItem("command-timestamp") || Date.now()
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
        
        const promiss = HttpUtil.put(HttpUtil.path.task, {
            method: command,
            data: json
        })
        if (callback) {
            promiss.then(callback)
        }
        promiss.finally(() => {
            setLastestTimestamp(Date.now())
        })
    },
    canFetchData: () => {
        const currentTimestamp = Date.now()
        const latestTimestamp = getLastestTimestamp()
        // 暂定10秒
        return currentTimestamp - latestTimestamp < 10000
    },
    reset: () => {
        clearLastestTimestamp()
    },
    resetNow: () => {
        setLastestTimestamp(Date.now())
    }
}