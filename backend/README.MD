## 后端配置

### 后端程序选择

#### python-backend（推荐）

[Python Backend](./python-backend/README.md) 是使用 Python Flask 构建的轻量级后端服务，具有以下特点：

- 轻量级，资源占用少
- 支持 Docker 部署
- 内置数据持久化
- 简单的 Token 验证

**快速启动：**

```bash
# 使用 Docker
cd python-backend
docker-compose up -d

# 或手动运行
pip install -r requirements.txt
python app.py
```

详细请到 [Python Backend](./python-backend/README.md) 页面查看。

#### simple-backend

[SimpleBackend](./simple-backend/README.MD) 是用 Spring Boot 制作的符合 OC-AE 要求的后端程序，并且带有简单的鉴权验证。

详细请到 [SimpleBackend](./simple-backend/README.MD) 页面查看。

#### json-server（已弃用）

后端默认采用的 [json-server](https://github.com/typicode/json-server)，可以使用指令 `npm install json-server -g` 安装至全局环境中。

json-server 运行的初始json文件内容如下：
```json
{
  "items": {},      // 物品数据
  "cpus": {},       // CPU 数据（对象类型）
  "essentia": {},   // 源质数据
  "fluids": {},     // 流体数据
  "task": {}        // 任务数据
}
```

使用命令 `json-server oc.json` 开启一个简单的后端服务器。

### 启用鉴权

#### NGINX

使用 NGINX 作为下游服务端， 反向代理请求至上游的 json-server 服务端，在反向代理时先通过跨域请求，再对凭据进行校验。

```
location / {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header If-Modified-Since $http_if_modified_since;
    proxy_set_header ocaetoken $http_ocaetoken;

    # 通过跨域请求
    if ($request_method = 'OPTIONS') {
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Headers *;
        add_header Access-Control-Allow-Methods GET,POST,OPTIONS,PUT,DELETE;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }

    # 改TOKEN为你想要的密钥
    if ($http_ocaetoken = "TOKEN") {
        proxy_pass http://127.0.0.1:60008;
    }
}
```


### 自定义后端

若不想使用 json-server, 想自己搭建一个后端程序，那么请依据如下规则设计一个RESTFUL风格后端程序。

**所有数据传输都建立在 json 格式字符串之上。**

#### 数据类型

##### 对象类型（`{}`）

假设有一个名为 `items` 的路径代表对一个 **对象类型** 的资源进行操作，那么需要实现的接口有

```
/items PUT: 为这个对象更新内容
/items GET: 获取这个对象信息
```

##### 带键的对象类型（如 `cpus`）

`cpus` 是一个特殊的对象类型，使用 CPU 名称作为键：

```
/cpus GET: 获取整个对象，以json格式返回。
/cpus/<name> GET: 获取指定名称的 CPU 信息
/cpus/<name> PUT: 更新或创建指定名称的 CPU 信息
/cpus/<name> DELETE: 删除指定名称的 CPU 信息
```

#### 需要的资源路径

**以下资源路径都省略了共同的URL地址部分，例如`https://blog.smileyik.eu.org/oc-ae/items`与`https://blog.smileyik.eu.org/oc-ae/cpus`将被缩写为`/items`与`/cpus`**

```
/items: 对象类型，代表AE中的物品
/cpus: 对象类型，代表AE中的CPU（键为CPU名称）
/essentia: 对象类型，代表AE中的源质
/fluids: 对象类型，代表AE中的流体
/task: 对象类型，代表任务
```
