#!/usr/bin/env python3
"""
GTNH-OC-AE-Controller Python Backend
A simple REST API backend for OpenComputers AE2 Controller
"""

import os
import json
import logging
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# 配置
DATA_DIR = os.environ.get('DATA_DIR', '/app/data')
TOKEN = os.environ.get('TOKEN', '123456')

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)

# 数据存储
data_store = {
    'items': {'type': 'object', 'data': {}, 'file': 'items.json'},
    'cpus': {'type': 'array', 'data': [], 'file': 'cpus.json'},
    'task': {'type': 'object', 'data': {}, 'file': 'task.json'},
    'fluids': {'type': 'object', 'data': {}, 'file': 'fluids.json'},
    'essentia': {'type': 'object', 'data': {}, 'file': 'essentia.json'},
}

def get_file_path(name):
    """获取数据文件路径"""
    return os.path.join(DATA_DIR, data_store[name]['file'])

def load_data(name):
    """从文件加载数据"""
    file_path = get_file_path(name)
    try:
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                data_store[name]['data'] = json.load(f)
                logger.info(f"Loaded {name} from {file_path}")
    except Exception as e:
        logger.error(f"Error loading {name}: {e}")

def save_data(name):
    """保存数据到文件"""
    file_path = get_file_path(name)
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data_store[name]['data'], f, indent=2, ensure_ascii=False)
            logger.info(f"Saved {name} to {file_path}")
    except Exception as e:
        logger.error(f"Error saving {name}: {e}")

def load_all_data():
    """加载所有数据"""
    for name in data_store:
        load_data(name)

def check_token():
    """检查 Token"""
    token = request.headers.get('ocaetoken', '')
    if TOKEN and token != TOKEN:
        return False
    return True

# ============================================
# 通用路由
# ============================================

@app.route('/<path:endpoint>', methods=['GET'])
def get_endpoint(endpoint):
    """获取数据"""
    # 移除开头的斜杠
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    store = data_store[endpoint]
    data = store['data']
    
    logger.info(f"GET /{endpoint} - type: {store['type']}, data size: {len(data) if isinstance(data, (list, dict)) else 'N/A'}")
    
    # 禁用缓存
    response = jsonify(data)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/<path:endpoint>', methods=['PUT'])
def put_endpoint(endpoint):
    """替换数据"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    if not check_token():
        return jsonify({'error': 'Unauthorized'}), 401
    
    store = data_store[endpoint]
    data = request.get_json()
    
    logger.info(f"PUT /{endpoint} - received data")
    
    if store['type'] == 'object':
        # 检查是否是分批请求
        if isinstance(data, dict) and 'batch' in data and 'totalBatches' in data:
            return handle_batch_request(endpoint, data)
        
        # 普通请求，直接替换
        store['data'] = data
    else:
        # Array 类型不应该直接 PUT，应该使用 POST 或 PUT /{id}
        store['data'] = data if isinstance(data, list) else []
    
    save_data(endpoint)
    return jsonify(store['data'])

@app.route('/<path:endpoint>', methods=['POST'])
def post_endpoint(endpoint):
    """添加数据（Array 类型）"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    if not check_token():
        return jsonify({'error': 'Unauthorized'}), 401
    
    store = data_store[endpoint]
    
    if store['type'] != 'array':
        return jsonify({'error': 'Method not allowed for object type'}), 405
    
    data = request.get_json()
    
    if 'id' not in data:
        data['id'] = len(store['data'])
    
    store['data'].append(data)
    save_data(endpoint)
    
    logger.info(f"POST /{endpoint} - added item with id: {data.get('id')}")
    return jsonify(data), 201

@app.route('/<path:endpoint>', methods=['DELETE'])
def delete_endpoint(endpoint):
    """删除所有数据"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    if not check_token():
        return jsonify({'error': 'Unauthorized'}), 401
    
    store = data_store[endpoint]
    result = store['data']
    
    if store['type'] == 'object':
        store['data'] = {}
    else:
        store['data'] = []
    
    save_data(endpoint)
    logger.info(f"DELETE /{endpoint} - cleared all data")
    return jsonify(result)

# ============================================
# 带ID的路由（Array 类型）
# ============================================

@app.route('/<path:endpoint>/<item_id>', methods=['GET'])
def get_item(endpoint, item_id):
    """获取单个元素"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    store = data_store[endpoint]
    
    if store['type'] != 'array':
        return jsonify({'error': 'Method not allowed for object type'}), 405
    
    # 通过 id 字段查找
    for item in store['data']:
        if isinstance(item, dict) and str(item.get('id', '')) == item_id:
            logger.info(f"GET /{endpoint}/{item_id} - found")
            return jsonify(item)
    
    # 尝试通过索引查找
    try:
        idx = int(item_id)
        if 0 <= idx < len(store['data']):
            return jsonify(store['data'][idx])
    except ValueError:
        pass
    
    logger.info(f"GET /{endpoint}/{item_id} - not found")
    return jsonify({'error': 'Item not found'}), 404

@app.route('/<path:endpoint>/<item_id>', methods=['PUT'])
def put_item(endpoint, item_id):
    """更新或创建单个元素（Array 类型）"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    if not check_token():
        return jsonify({'error': 'Unauthorized'}), 401
    
    store = data_store[endpoint]
    
    if store['type'] != 'array':
        return jsonify({'error': 'Method not allowed for object type'}), 405
    
    data = request.get_json()
    
    # 确保 id 字段存在
    if 'id' not in data:
        data['id'] = item_id
    
    logger.info(f"PUT /{endpoint}/{item_id} - id: {data.get('id')}, busy: {data.get('busy')}")
    
    # 查找现有元素
    for i, item in enumerate(store['data']):
        if isinstance(item, dict) and str(item.get('id', '')) == item_id:
            store['data'][i] = data
            save_data(endpoint)
            logger.info(f"PUT /{endpoint}/{item_id} - updated at index {i}")
            return jsonify(data)
    
    # 没找到，创建新元素
    store['data'].append(data)
    save_data(endpoint)
    logger.info(f"PUT /{endpoint}/{item_id} - created new, array size: {len(store['data'])}")
    return jsonify(data)

@app.route('/<path:endpoint>/<item_id>', methods=['DELETE'])
def delete_item(endpoint, item_id):
    """删除单个元素（Array 类型）"""
    endpoint = endpoint.strip('/')
    
    if endpoint not in data_store:
        return jsonify({'error': 'Not found'}), 404
    
    if not check_token():
        return jsonify({'error': 'Unauthorized'}), 401
    
    store = data_store[endpoint]
    
    if store['type'] != 'array':
        return jsonify({'error': 'Method not allowed for object type'}), 405
    
    # 查找并删除
    for i, item in enumerate(store['data']):
        if isinstance(item, dict) and str(item.get('id', '')) == item_id:
            result = store['data'].pop(i)
            save_data(endpoint)
            logger.info(f"DELETE /{endpoint}/{item_id} - deleted")
            return jsonify(result)
    
    logger.info(f"DELETE /{endpoint}/{item_id} - not found")
    return jsonify({'error': 'Item not found'}), 404

# ============================================
# 分批处理（Object 类型）
# ============================================

# 分批状态存储
batch_states = {}

def handle_batch_request(endpoint, data):
    """处理分批请求"""
    batch = data.get('batch', 1)
    total_batches = data.get('totalBatches', 1)
    items = data.get('result', [])
    
    logger.info(f"PUT /{endpoint} - batch {batch}/{total_batches}, items: {len(items)}")
    
    # 获取或创建批次状态
    if endpoint not in batch_states or batch == 1:
        batch_states[endpoint] = {
            'received': 0,
            'total': total_batches,
            'items': []
        }
    
    state = batch_states[endpoint]
    state['total'] = total_batches
    state['items'].extend(items)
    state['received'] += 1
    
    # 检查是否所有批次都已接收
    if state['received'] >= total_batches:
        # 合并数据
        result = {
            'result': state['items'],
            'totalItems': len(state['items']),
            'batches': total_batches
        }
        data_store[endpoint]['data'] = result
        save_data(endpoint)
        
        # 清理状态
        del batch_states[endpoint]
        
        logger.info(f"PUT /{endpoint} - batch complete, total items: {len(state['items'])}")
        return jsonify(result)
    
    # 返回进度
    return jsonify({
        'status': 'receiving',
        'batch': batch,
        'totalBatches': total_batches,
        'receivedBatches': state['received'],
        'accumulatedItems': len(state['items'])
    })

# ============================================
# 健康检查
# ============================================

@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/', methods=['GET'])
def index():
    """根路径"""
    return jsonify({
        'name': 'GTNH-OC-AE-Controller Backend',
        'version': '1.0.0',
        'endpoints': list(data_store.keys())
    })

# ============================================
# 启动
# ============================================

if __name__ == '__main__':
    # 加载所有数据
    load_all_data()
    
    # 启动服务
    port = int(os.environ.get('PORT', 60081))
    logger.info(f"Starting server on port {port}")
    logger.info(f"Data directory: {DATA_DIR}")
    
    app.run(host='0.0.0.0', port=port, debug=False)