# GTNH-OC-AE-Controller Python Backend

一个简单的 Python Flask 后端，用于 OpenComputers AE2 控制器。

## 特点

- 轻量级：基于 Python Flask，内存占用小
- 简单：代码简洁易懂，便于调试
- 持久化：数据自动保存到 JSON 文件
- 分批处理：支持大量物品数据的分批上传

## 快速开始

### 使用 Docker Compose（推荐）

```bash
# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止
docker-compose down
```

### 使用 Docker

```bash
# 构建镜像
docker build -t gtnh-oc-ae-controller .

# 运行容器
docker run -d \
  --name gtnh-oc-ae-controller \
  -p 60081:60081 \
  -v $(pwd)/data:/app/data \
  -e TOKEN=123456 \
  gtnh-oc-ae-controller

# 查看日志
docker logs -f gtnh-oc-ae-controller
```

### 本地运行

```bash
# 安装依赖
pip install -r requirements.txt

# 运行
python app.py
```

## 配置

通过环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| PORT | 60081 | 服务端口 |
| TOKEN | 123456 | API Token（用于认证） |
| DATA_DIR | /app/data | 数据存储目录 |

## API 端点

### 物品 (items)

- `GET /items` - 获取所有物品
- `PUT /items` - 替换所有物品（支持分批）
- `DELETE /items` - 删除所有物品

### CPU (cpus)

- `GET /cpus` - 获取所有 CPU
- `GET /cpus/{id}` - 获取单个 CPU
- `PUT /cpus/{id}` - 更新或创建 CPU
- `DELETE /cpus/{id}` - 删除 CPU
- `DELETE /cpus` - 删除所有 CPU

### 任务 (task)

- `GET /task` - 获取任务
- `PUT /task` - 更新任务
- `DELETE /task` - 删除任务

### 流体 (fluids)

- `GET /fluids` - 获取所有流体
- `PUT /fluids` - 替换所有流体
- `DELETE /fluids` - 删除所有流体

### 原质 (essentia)

- `GET /essentia` - 获取所有原质
- `PUT /essentia` - 替换所有原质
- `DELETE /essentia` - 删除所有原质

### 其他

- `GET /health` - 健康检查
- `GET /` - 服务信息

## 分批上传

对于大量数据（如物品列表），支持分批上传：

```json
PUT /items
{
  "batch": 1,
  "totalBatches": 5,
  "result": [...]
}
```

当所有批次上传完成后，数据会自动合并。

## 日志

所有请求都会记录日志，包括：
- 请求方法和路径
- 数据大小
- 操作结果

查看 Docker 日志：
```bash
docker logs -f gtnh-oc-ae-controller
```

## 与 Java 后端的区别

| 特性 | Python 后端 | Java 后端 |
|------|-------------|-----------|
| 内存占用 | ~30MB | ~50MB |
| 启动速度 | 快 | 较慢 |
| 代码复杂度 | 简单 | 复杂 |
| 调试难度 | 容易 | 较难 |
| 功能 | 完整 | 完整 |