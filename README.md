# GTNH-OC-AE-Controller

<div align="center">

**GTNH OpenComputers AE 网络控制器**

通过网页端远程控制和监控你的 Applied Energistics 网络

[在线体验](https://blog.smileyik.eu.org/oc-ae/) | [功能特性](#功能特性) | [快速开始](#快速开始)

</div>

---

## 项目简介

GTNH-OC-AE-Controller 是一个专为 GTNH (GregTech New Horizons) 模组包设计的工具，允许玩家通过网页端远程控制和监控游戏内的 Applied Energistics (AE) 网络。通过 OpenComputers (OC) 电脑作为桥梁，实现游戏内外数据的实时同步。

## 功能特性

- 🔍 **物品搜索** - 搜寻并查看 AE 网络中的所有物品
- 💧 **流体管理** - 获取网络中所有流体信息
- ✨ **源质查看** - 查看网络中存储的所有源质 (Essentia)
- 🖥️ **CPU 监控** - 获取并监控所有 ME 网络 CPU 的工作状态
  - 实时状态更新，无闪烁显示
  - 智能监控：仅在 CPU 忙碌时主动更新
  - 支持排序和筛选
- 🛠️ **远程合成** - 请求网络自动合成指定物品
- 📊 **实时状态** - 监控 CPU 工作状态直至任务完成

## 系统架构

```
┌─────────────────┐     HTTP      ┌─────────────────┐     HTTP      ┌─────────────────┐
│   前端控制面板   │ ◄──────────► │    后端服务     │ ◄──────────► │  OC 电脑 (游戏内) │
│   (React + Vite) │              │ (Python/Java)   │              │   (Lua 脚本)     │
└─────────────────┘              └─────────────────┘              └─────────────────┘
                                                                        │
                                                                        ▼
                                                               ┌─────────────────┐
                                                               │   AE 网络       │
                                                               │  (ME 接口)      │
                                                               └─────────────────┘
```

## 仓库目录结构

| 目录 | 说明 |
|------|------|
| [`oc/`](./oc) | OpenComputers Lua 脚本，运行在游戏内的 OC 电脑上 |
| [`front/`](./front) | 前端控制面板 (React + Vite + Ant Design) |
| [`backend/`](./backend) | 后端服务 (支持 Python Flask 和 Spring Boot 两种方案) |
| [`tools/`](./tools) | 辅助工具 (数据库转换工具) |
| [`docs/`](./docs) | 文档图片资源 |

## 快速开始

### 前置要求

在游戏中需要准备：
- 装有**因特网网卡**的 OC 电脑
- 紧贴着 ME 接口的**适配器**
- 至少 2 根 T1 内存条
- 已安装 OpenOS

### 步骤一：安装 OC 程序

在游戏内的 OC 电脑上运行以下命令：

```lua
wget https://github.com/5418ly/GTNH-OC-AE-Controller/raw/refs/heads/master/oc/installer.lua ./oc-ae-installer.lua && ./oc-ae-installer.lua --target-directory "/home/oc-ae"
```

安装完成后，编辑 `./oc-ae/config.lua` 配置文件。

### 步骤二：搭建后端服务

#### 方案 A：使用分享服务器（推荐新手）

如果你不想自己搭建后端，可以使用分享的服务器：

1. 访问 [在线体验](https://blog.smileyik.eu.org/oc-ae/) 网站
2. 进入 `Apply` 页面，申领一个网络空间地址
3. 保存获取到的后端地址和验证凭据

![申领成功](./docs/3.png)

#### 方案 B：自行搭建后端

详细搭建教程请参考 [`backend/README.MD`](./backend/README.MD)

**方案 B1：Python 后端（推荐）**

```bash
# 使用 Docker
cd backend/python-backend
docker-compose up -d

# 或手动运行
pip install -r requirements.txt
python app.py
```

**方案 B2：Java 后端**

```bash
# 使用 Docker
cd backend/simple-backend
docker build -t oc-ae-backend .
docker run -d --name backend -p 60081:60081 oc-ae-backend

# 或手动构建
./gradlew bootJar
java -jar build/libs/simple-backend-*.jar config.json
```

### 步骤三：配置前端

1. 访问 [在线体验](https://blog.smileyik.eu.org/oc-ae/) 或自行部署前端
2. 进入 `Config` 页面
3. 填入后端地址和 Token

![填入配置](./docs/4.png)

### 步骤四：配置 OC 程序

修改游戏内 `./oc-ae/config.lua` 文件：

```lua
return {
    sleep = 10,                     -- 两次执行任务时间隔多少秒
    token = "your-token",           -- 验证凭据
    baseUrl = "https://your-backend-url",  -- 后端地址
    path = {
        task = "/task",             -- 任务数据路径
        cpu = "/cpus",              -- CPU 数据路径
        essentia = "/essentia",     -- 源质数据路径
        fluids = "/fluids",         -- 流体数据路径
        items = "/items"            -- 物品数据路径
    }
}
```

### 步骤五：启动程序

在游戏内运行：

```lua
./oc-ae/main.lua
```

## 前端页面说明

| 页面 | 功能 |
|------|------|
| Index | 首页概览 |
| Items | 物品搜索与查看 |
| Fluids | 流体管理 |
| Essentia | 源质查看 |
| Cpus | CPU 状态监控 |
| Config | 后端配置 |
| Apply | 申领分享服务器空间 |
| Docs | 帮助文档 |

## 效果展示

![CPU 监控](./docs/1.png)
![物品搜索](./docs/2.png)

## 技术栈

### 前端
- React 18
- Vite 5
- Ant Design 6
- React Router DOM 7

### 后端
- Python Flask (推荐，轻量级)
- Spring Boot (Java 方案)

### 游戏内
- OpenComputers (Lua 脚本)

## 开发指南

### 前端开发

```bash
cd front
npm install
npm run dev     # 开发模式
npm run build   # 构建生产版本
```

### 后端开发

```bash
cd backend/simple-backend
./gradlew bootJar
```

### 添加新功能

详细开发指南请参考各子目录的 README 文件。

## 数据来源

前端使用的物品图片与物品数据库由 [IRR (Item-Render-Rebirth)](https://github.com/0999312/Item-Render-Rebirth) 导出。

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](./LICENSE) 文件。

## 致谢

- 感谢所有分享后端服务器的用户
- 感谢 [IRR](https://github.com/0999312/Item-Render-Rebirth) 项目提供的数据导出工具

---

<div align="center">

**⚠️ 请珍惜他人分享的后端服务器，拒绝滥用，合理使用！**

</div>