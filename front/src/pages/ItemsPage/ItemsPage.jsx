import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Input, Button, List, Typography, Space, Modal, InputNumber, message, Form, Spin, Empty, Select, Descriptions, Tag, Tooltip, Progress, Statistic, Row, Col, Alert } from 'antd';
import { SearchOutlined, ClearOutlined, ReloadOutlined, DeleteOutlined, CloudSyncOutlined, InfoCircleOutlined, CopyOutlined, RocketOutlined, DatabaseOutlined, SyncOutlined } from '@ant-design/icons';
import ItemStack from '../../components/itemStack/ItemStack';
import httpUtil from '../../HttpUtil';
import CommandUtil from '../../commons/CommandUtil';

const { Option } = Select;
const { Paragraph, Text, Title } = Typography;

export default function ItemsPage() {
    const [items, setItems] = useState([]);
    const [lastModified, setLastModified] = useState("");
    const [searchForm] = Form.useForm();
    const [filteredItems, setFilteredItems] = useState([]);
    
    // Crafting Modal State
    const [craftModalVisible, setCraftModalVisible] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [craftAmount, setCraftAmount] = useState(1);
    const [cpus, setCpus] = useState([]);
    const [selectedCpu, setSelectedCpu] = useState(null);
    const [loadingCpus, setLoadingCpus] = useState(false);

    // Info Modal State
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoItem, setInfoItem] = useState(null);
    const [infoDbItem, setInfoDbItem] = useState(null);

    // Filter state
    const [filters, setFilters] = useState({
        name: '',
        label: '',
        damage: ''
    });
    
    // Loading and progress state
    const [refreshing, setRefreshing] = useState(false);
    const [refreshProgress, setRefreshProgress] = useState(null);

    // Statistics
    const stats = useMemo(() => {
        const total = items.length;
        const craftable = items.filter(i => i.isCraftable).length;
        const stored = items.filter(i => i.size > 0).length;
        const totalItems = items.reduce((sum, i) => sum + (i.size || 0), 0);
        return { total, craftable, stored, totalItems };
    }, [items]);

    // Polling logic
    useEffect(() => {
        const timer = setInterval(() => {
            if (!CommandUtil.canFetchData()) return;
            
            const headers = lastModified && lastModified !== "" ? { "If-Modified-Since": lastModified } : {};
            
            httpUtil.get(httpUtil.path.items, headers)
                .then(async response => {
                    if (response.status === 200) {
                        const r = await response.json();
                        if (r.result) {
                            setItems(r.result);
                        }
                        // 检查是否有分批进度信息
                        if (r.status === 'receiving') {
                            setRefreshProgress({
                                batch: r.batch,
                                totalBatches: r.totalBatches,
                                accumulatedItems: r.accumulatedItems
                            });
                        } else {
                            setRefreshProgress(null);
                            setRefreshing(false);
                        }
                        setLastModified(response.headers.get("last-modified"));
                    }
                })
                .catch(e => console.error("Fetch items failed", e));
        }, 1000);
        return () => clearInterval(timer);
    }, [lastModified]);

    // Filter logic
    useEffect(() => {
        let res = items;
        if (filters.name) {
            res = res.filter(elem => elem.name && elem.name.toLowerCase().includes(filters.name.toLowerCase()));
        }
        if (filters.label) {
            res = res.filter(elem => elem.label && elem.label.toLowerCase().includes(filters.label.toLowerCase()));
        }
        if (filters.damage) {
            res = res.filter(elem => elem.damage && String(elem.damage) === filters.damage);
        }
        setFilteredItems(res);
    }, [items, filters]);

    // Fetch CPUs
    const fetchCpus = useCallback(() => {
        setLoadingCpus(true);
        httpUtil.get(httpUtil.path.cpus)
            .then(async resp => {
                if (resp.status === 200) {
                    const data = await resp.json();
                    // 支持对象格式和数组格式
                    const cpusArray = Array.isArray(data) ? data : Object.values(data || {});
                    setCpus(cpusArray);
                }
            })
            .finally(() => setLoadingCpus(false));
    }, []);

    const handleCraftRequest = useCallback((itemStack) => {
        if (!itemStack || !itemStack.isCraftable) return;
        setSelectedItem(itemStack);
        setCraftAmount(1);
        setSelectedCpu(null);
        fetchCpus();
        setCraftModalVisible(true);
    }, [fetchCpus]);

    const handleShowInfo = useCallback((itemStack, dbItem) => {
        setInfoItem(itemStack);
        setInfoDbItem(dbItem);
        setInfoModalVisible(true);
    }, []);

    const submitCraft = () => {
        if (!selectedItem || craftAmount <= 0) return;

        const filter = {
            name: selectedItem.name,
            damage: Number(selectedItem.damage)
        };
        if (selectedItem.aspect) {
            filter.aspect = selectedItem.aspect;
        }

        const payload = {
            filter: filter,
            amount: Number(craftAmount)
        };
        
        if (selectedCpu) {
            payload.cpuName = selectedCpu;
        }

        CommandUtil.submitCommand("requestItem", JSON.stringify(payload, null, 2), async resp => {
            if (resp.status === 200) {
                message.success(`已请求制造 ${craftAmount} 个 ${selectedItem.label}`);
                setCraftModalVisible(false);
            } else {
                message.error("请求失败");
            }
        });
    };

    const handleClearItems = () => {
        Modal.confirm({
            title: '确认清理',
            content: '确定要清理所有物品缓存吗？',
            onOk: () => {
                httpUtil.put(httpUtil.path.items, { "result": [] }).then(() => {
                    message.success("已清理");
                    setItems([]);
                });
            }
        });
    };

    // 刷新所有物品（不仅是可合成的）
    const handleRefreshAllItems = useCallback(() => {
        setRefreshing(true);
        setRefreshProgress(null);
        CommandUtil.submitCommand("refreshStorage", { 
            batchSize: 500,
            maxItems: 20000
        }, () => {
            message.info("已发送搜寻所有物品请求，请等待数据加载...");
        });
    }, []);

    // 只刷新可合成物品
    const handleRefreshCraftableItems = useCallback(() => {
        setRefreshing(true);
        setRefreshProgress(null);
        CommandUtil.submitCommand("refreshStorage", { 
            isCraftable: true,
            batchSize: 500,
            maxItems: 10000
        }, () => {
            message.info("已发送搜寻可制造物品请求，请等待数据加载...");
        });
    }, []);

    const onSearch = (values) => {
        setFilters(values);
    };

    const onReset = () => {
        searchForm.resetFields();
        setFilters({ name: '', label: '', damage: '' });
    };

    return (
        <Card style={{ minHeight: '100%' }}>
            {/* Statistics */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                    <Statistic 
                        title="物品种类" 
                        value={stats.total} 
                        prefix={<DatabaseOutlined />}
                        suffix="种"
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="可合成" 
                        value={stats.craftable} 
                        prefix={<RocketOutlined />}
                        valueStyle={{ color: '#3f8600' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="有库存" 
                        value={stats.stored} 
                        prefix={<DatabaseOutlined />}
                        valueStyle={{ color: '#1890ff' }}
                    />
                </Col>
                <Col span={6}>
                    <Statistic 
                        title="总物品数" 
                        value={stats.totalItems} 
                        prefix={<DatabaseOutlined />}
                    />
                </Col>
            </Row>

            {/* Progress indicator */}
            {refreshing && refreshProgress && (
                <Alert 
                    type="info" 
                    style={{ marginBottom: 16 }}
                    message={
                        <Space>
                            <SyncOutlined spin />
                            <span>正在接收数据...</span>
                            <Progress 
                                percent={Math.round((refreshProgress.batch / refreshProgress.totalBatches) * 100)} 
                                size="small" 
                                style={{ width: 200 }}
                            />
                            <span>({refreshProgress.accumulatedItems} 物品)</span>
                        </Space>
                    }
                />
            )}

            {/* Action buttons */}
            <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <Button 
                    type="primary" 
                    icon={<CloudSyncOutlined />} 
                    onClick={handleRefreshAllItems}
                    loading={refreshing}
                >
                    搜寻所有物品
                </Button>
                <Button 
                    icon={<RocketOutlined />} 
                    onClick={handleRefreshCraftableItems}
                    loading={refreshing}
                >
                    搜寻可制造物品
                </Button>
                <Button danger icon={<DeleteOutlined />} onClick={handleClearItems}>
                    清理缓存
                </Button>
            </Space>

            {/* Search form */}
            <Form form={searchForm} layout="inline" onFinish={onSearch} style={{ marginBottom: 16 }}>
                <Form.Item name="name" label="类型 (ID)">
                    <Input placeholder="输入 ID" allowClear />
                </Form.Item>
                <Form.Item name="label" label="名称">
                    <Input placeholder="输入显示名称" allowClear />
                </Form.Item>
                <Form.Item name="damage" label="损伤值">
                    <Input placeholder="Meta" style={{ width: 80 }} allowClear />
                </Form.Item>
                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>搜索</Button>
                        <Button onClick={onReset} icon={<ClearOutlined />}>重置</Button>
                    </Space>
                </Form.Item>
            </Form>

            {/* Items list */}
            <Spin spinning={refreshing && !refreshProgress} tip="正在获取物品信息...">
                <List
                    grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
                    dataSource={filteredItems}
                    pagination={{
                        position: 'bottom',
                        align: 'center',
                        showSizeChanger: true,
                        defaultPageSize: 24,
                        pageSizeOptions: ['24', '48', '96', '192'],
                        showTotal: (total) => `共 ${total} 种物品`
                    }}
                    locale={{ emptyText: <Empty description="暂无物品数据，请点击搜寻按钮获取" /> }}
                    renderItem={(item) => (
                        <List.Item>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <ItemStack 
                                    itemStack={item} 
                                    onCraftRequest={handleCraftRequest} 
                                    onShowInfo={handleShowInfo}
                                />
                            </div>
                        </List.Item>
                    )}
                />
            </Spin>

            {/* Craft Modal */}
            <Modal
                title={
                    <Space>
                        <RocketOutlined />
                        <span>制造请求</span>
                    </Space>
                }
                open={craftModalVisible}
                onOk={submitCraft}
                onCancel={() => setCraftModalVisible(false)}
                okText="开始制造"
                cancelText="取消"
            >
                {selectedItem && (
                    <Form layout="vertical">
                         <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, padding: 12, background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                            <div style={{ marginRight: 16 }}>
                                <ItemStack itemStack={selectedItem} />
                            </div>
                            <div>
                                <Title level={5} style={{ margin: 0 }}>{selectedItem.label}</Title>
                                <Text type="secondary">{selectedItem.name}</Text>
                            </div>
                        </div>

                        <Form.Item label="数量">
                            <InputNumber 
                                min={1} 
                                value={craftAmount} 
                                onChange={setCraftAmount} 
                                style={{ width: '100%' }} 
                                autoFocus
                            />
                        </Form.Item>

                        <Form.Item label="选择 CPU">
                            <Select
                                placeholder="自动选择 (Auto)"
                                value={selectedCpu}
                                onChange={setSelectedCpu}
                                loading={loadingCpus}
                                allowClear
                            >
                                <Option value={null}>自动选择 (Auto)</Option>
                                {cpus.map(cpu => (
                                    <Option key={cpu.id} value={cpu.id}>
                                        {cpu.id} {cpu.busy ? '(Busy)' : '(Idle)'} - Storage: {cpu.storage}
                                    </Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                )}
            </Modal>

            {/* Info Modal */}
            <Modal
                title="物品详情"
                open={infoModalVisible}
                onCancel={() => setInfoModalVisible(false)}
                footer={[
                    <Button key="close" type="primary" onClick={() => setInfoModalVisible(false)}>
                        关闭
                    </Button>
                ]}
                width={600}
            >
                {infoItem && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                         <div style={{ display: 'flex', gap: 16 }}>
                             <div>
                                <ItemStack itemStack={infoItem} />
                             </div>
                             <div style={{ flex: 1 }}>
                                <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label="显示名称">
                                        <Paragraph copyable style={{ margin: 0 }}>{infoItem.label}</Paragraph>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="ID (Name)">
                                        <Paragraph copyable style={{ margin: 0 }}>{infoItem.name}</Paragraph>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Meta / Damage">
                                        <Paragraph copyable style={{ margin: 0 }}>{infoItem.damage}</Paragraph>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="数量">
                                        {infoItem.size}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="可制造">
                                        {infoItem.isCraftable ? <Tag color="green">Yes</Tag> : <Tag color="red">No</Tag>}
                                    </Descriptions.Item>
                                </Descriptions>
                             </div>
                         </div>
                         
                         <div>
                            <Title level={5}>完整原始数据 (JSON)</Title>
                            <Input.TextArea 
                                value={JSON.stringify(infoItem, null, 2)} 
                                autoSize={{ minRows: 4, maxRows: 10 }} 
                                readOnly
                                style={{ fontFamily: 'monospace' }}
                            />
                         </div>
                    </div>
                )}
            </Modal>
        </Card>
    );
}