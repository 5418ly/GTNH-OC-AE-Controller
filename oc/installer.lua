-- GTNH-OC-AE-Controller 安装脚本
-- 仓库: https://github.com/5418ly/GTNH-OC-AE-Controller

local GITHUB_REPO = "5418ly/GTNH-OC-AE-Controller"
local GITHUB_BRANCH = "master"
local GITHUB_RAW_BASE = "https://github.com/" .. GITHUB_REPO .. "/raw/refs/heads/" .. GITHUB_BRANCH .. "/oc/"

local NEED_DOWNLOAD = {
    ["config"] = GITHUB_RAW_BASE .. "config.lua",
    ["cpu"] = GITHUB_RAW_BASE .. "cpu.lua",
    ["http-method"] = GITHUB_RAW_BASE .. "http-method.lua",
    ["json"] = GITHUB_RAW_BASE .. "json.lua",
    ["main"] = GITHUB_RAW_BASE .. "main.lua"
}

local function checkInternetCard()
    -- check internet card
    local component = require("component")
    if component == nil or component.internet == nil then
        return
    end
end

if not pcall(checkInternetCard) then
    print("you need an internet card to continue!")
    return
end

local pwd = os.getenv().PWD
local targetDirectory = "oc-ae"

local args = { ... }

for i in pairs(args) do
    if args[i] == "--target-directory" or args[i] == "-td" then
        i = i + 1
        if args[i] ~= nil and type(args[i]) == "string" then
            targetDirectory = args[i]
        end
    end
end

if string.find(targetDirectory, "/") ~= 1 then
    targetDirectory = pwd .. "/" .. targetDirectory
end

print("============================================")
print("GTNH-OC-AE-Controller Installer")
print("Repository: " .. GITHUB_REPO)
print("Branch: " .. GITHUB_BRANCH)
print("============================================")
print("Target directory: " .. targetDirectory)
print("")

local createdDirs = {}
local successCount = 0
local failCount = 0

for filePath, url in pairs(NEED_DOWNLOAD) do
    local targetFile = targetDirectory .. "/" .. filePath .. ".lua"
    local i = string.len(targetFile) - string.find(string.reverse(targetFile), "/")
    local parentDir = string.sub(targetFile, 1, i)
    if nil == createdDirs[parentDir] then
        os.execute("mkdir " .. parentDir)
        createdDirs[parentDir] = true
    end
    
    print("Downloading: " .. filePath .. ".lua")
    local result = os.execute("wget " .. url .. " " .. targetFile)
    if result then
        successCount = successCount + 1
    else
        failCount = failCount + 1
        print("  [FAILED] Could not download " .. filePath .. ".lua")
    end
end

print("")
print("============================================")
print("Installation Summary:")
print("  Success: " .. successCount)
print("  Failed: " .. failCount)
print("============================================")

if failCount == 0 then
    print("Creating quick link to /home directory...")
    os.execute("echo \"os.execute(\\\"cd '" .. targetDirectory .. "' && ./main.lua\\\")\" > /home/oc-ae.lua")
    print("")
    print("Installation complete!")
    print("Run './oc-ae.lua' or 'cd " .. targetDirectory .. " && ./main.lua' to start.")
else
    print("Installation completed with errors.")
    print("Please check your internet connection and try again.")
end