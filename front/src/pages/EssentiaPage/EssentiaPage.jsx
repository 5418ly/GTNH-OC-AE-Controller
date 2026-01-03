import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Input, Button, List, Typography, Space, Modal, InputNumber, message, Form, Empty, Select, Descriptions, Tag } from 'antd';
import { SearchOutlined, ClearOutlined, DeleteOutlined, CloudSyncOutlined, RocketOutlined, InfoCircleOutlined } from '@ant-design/icons';
import ItemStack from '../../components/itemStack/ItemStack';
import httpUtil from '../../HttpUtil';
import CommandUtil from '../../commons/CommandUtil';

const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

export default function EssentiaPage() {
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

    // Polling logic
    useEffect(() => {
        const timer = setInterval(() => {
            if (!CommandUtil.canFetchData()) return;
            
            const headers = lastModified && lastModified !== "" ? { "If-Modified-Since": lastModified } : {};
            
            httpUtil.get(httpUtil.path.essentia + "?size=20000", headers)
                .then(async response => {
                    if (response.status === 200) {
                        const r = await response.json();
                        if (r.content) {
                            setItems(r.content);
                        }
                        setLastModified(response.headers.get("last-modified"));
                    }
                })
                .catch(e => console.error("Fetch essentia failed", e));
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
                    setCpus(data);
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
            aspect: selectedItem.aspect
        };

        const payload = {
            filter: filter,
            amount: Number(craftAmount)
        };
        
        if (selectedCpu) {
            payload.cpuName = selectedCpu;
        }

        CommandUtil.submitCommand("requestItem", JSON.stringify(payload, null, 2), async resp => {
            if (resp.status === 200) {
                message.success(`已请求制造 ${craftAmount} ${selectedItem.label}`);
                setCraftModalVisible(false);
            } else {
                message.error("请求失败");
            }
        });
    };

    const handleClearItems = () => {
        Modal.confirm({
            title: '确认清理',
            content: '确定要清理所有源质缓存吗？',
            onOk: () => {
                httpUtil.delete(httpUtil.path.essentia).then(() => {
                    message.success("已清理");
                    setItems([]);
                });
            }
        });
    };

    const handleRefreshStorage = () => {
        httpUtil.put(httpUtil.path.task, {
            "method": "refreshEssentiaStorage",
            "data": {}
        }).then(() => {
            message.info("已发送搜寻源质请求");
        });
    };

    const onSearch = (values) => {
        setFilters(values);
    };

    const onReset = () => {
        searchForm.resetFields();
        setFilters({ name: '', label: '', damage: '' });
    };

    return (
        <Card style={{ minHeight: '100%' }}>
            <Space style={{ marginBottom: 16, flexWrap: 'wrap' }}>
                <Button danger icon={<DeleteOutlined />} onClick={handleClearItems}>清理所有源质</Button>
                <Button type="primary" icon={<CloudSyncOutlined />} onClick={handleRefreshStorage}>搜寻源质</Button>
            </Space>

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

            <List
                grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 5, xxl: 6 }}
                dataSource={filteredItems}
                pagination={{
                    position: 'bottom',
                    align: 'center',
                    showSizeChanger: true,
                    defaultPageSize: 24,
                    pageSizeOptions: ['24', '48', '96', '192']
                }}
                locale={{ emptyText: <Empty description="暂无源质数据" /> }}
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

            {/* Craft Modal */}
            <Modal
                title={
                    <Space>
                        <RocketOutlined />
                        <span>源质制造请求</span>
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
                title="源质详情"
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