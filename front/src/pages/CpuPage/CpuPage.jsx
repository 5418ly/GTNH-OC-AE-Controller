import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Card, Button, Space, Typography, Empty, List, Divider, message, Modal, Descriptions, Input, Select, Tag } from "antd";
import { CloudSyncOutlined, LineChartOutlined, StopOutlined, ReloadOutlined, SortAscendingOutlined, EyeOutlined } from "@ant-design/icons";
import httpUtil from "../../HttpUtil.jsx";
import AeCpuCard from "../../components/AeCpuCard/AeCpuCard.jsx";
import ItemStack from "../../components/itemStack/ItemStack.jsx";
import CommandUtil from "../../commons/CommandUtil.jsx";
import "./CpuPage.css"

const { Title, Text } = Typography;
const { Option } = Select;

function CpuDetail({ cpu, onShowInfo }) {
    if (!cpu) return null;
    const cpuData = cpu.cpu || {};
    const activeItems = cpuData.activeItems || [];
    const pendingItems = cpuData.pendingItems || [];
    const storedItems = cpuData.storedItems || [];

    const renderItemList = (items, title) => (
        <Card size="small" title={title} style={{ marginBottom: 16 }}>
            {items.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无物品" />
            ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {items.map((item, idx) => (
                        item && (item.amount !== 0 || item.size !== 0) && (
                            <ItemStack 
                                itemStack={item} 
                                key={`${title}-${idx}`} 
                                onShowInfo={onShowInfo}
                            />
                        )
                    ))}
                </div>
            )}
        </Card>
    );

    return (
        <div style={{ marginTop: 24 }}>
            <Title level={4}>{cpu.id} 详细信息</Title>
            <Divider />
            <div className="ae-cpu-item-panel">
                {renderItemList(activeItems, "正在合成")}
                {renderItemList(pendingItems, "等待合成")}
                {renderItemList(storedItems, "缓存物品")}
            </div>
        </div>
    );
}

export default function CpuPage() {
    const [cpus, setCpus] = useState([]);
    const [selectedCpu, setSelectedCpu] = useState(null);
    const [lastModified, setLastModified] = useState("");
    const [monitoring, setMonitoring] = useState(false);
    
    // Sort State
    const [sortType, setSortType] = useState('name_asc');

    // Info Modal State
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoItem, setInfoItem] = useState(null);
    const [infoDbItem, setInfoDbItem] = useState(null);

    const fetchCpus = useCallback(() => {
        if (!CommandUtil.canFetchData()) return;
        httpUtil.get(httpUtil.path.cpus, lastModified ? { "If-Modified-Since": lastModified } : {})
            .then(async resp => {
                if (resp.status === 200) {
                    const data = await resp.json();
                    
                    // Smart merge to preserve details if new data lacks them
                    setCpus(prevCpus => {
                        return data.map(newCpu => {
                            const oldCpu = prevCpus.find(c => c.id === newCpu.id);
                            // If new data doesn't have detailed 'cpu' info (activeItems etc), but old one does, keep old details
                            // Note: 'cpu' property usually holds the detail object in this structure based on previous code
                            if (oldCpu && oldCpu.cpu && (!newCpu.cpu || !newCpu.cpu.activeItems)) {
                                return { ...newCpu, cpu: oldCpu.cpu };
                            }
                            return newCpu;
                        });
                    });

                    setLastModified(resp.headers.get("last-modified"));
                }
            });
    }, [lastModified]);

    useEffect(() => {
        // Initial fetch and trigger backend update
        httpUtil.get(httpUtil.path.cpus).then(async resp => {
            if (resp.status === 200) {
                setCpus(await resp.json());
            }
        });
        CommandUtil.submitCommand("simpleCpusInfo", {});

        const timer = setInterval(fetchCpus, 2000);
        return () => clearInterval(timer);
    }, [fetchCpus]);

    // Update selected CPU details when cpus list updates
    useEffect(() => {
        if (selectedCpu) {
            const updated = cpus.find(c => c.id === selectedCpu.id);
            if (updated) setSelectedCpu(updated);
        }
    }, [cpus, selectedCpu]);

    const handleCommand = (method, data = {}, successMsg = "请求已发送") => {
        httpUtil.put(httpUtil.path.task, { method, data }).then(() => {
            message.info(successMsg);
            if (method === "cpuMonitor") setMonitoring(true);
            if (method === "cancelMonitor") setMonitoring(false);
        });
    };

    const handleDeleteCpu = (cpu) => {
        if (!cpu || !cpu.id) return;
        Modal.confirm({
            title: '确认删除',
            content: `是否删除 ${cpu.id} 的信息？`,
            onOk: () => {
                httpUtil.delete(httpUtil.path.cpus + "/" + cpu.id).then(resp => {
                    if (resp.status === 200) {
                        message.success("已删除");
                        setCpus(prev => prev.filter(c => c.id !== cpu.id));
                        if (selectedCpu?.id === cpu.id) setSelectedCpu(null);
                    }
                });
            }
        });
    };

    const handleRefreshDetail = (cpuId) => {
        CommandUtil.submitCommand("cpuDetail", { id: cpuId }, (resp) => {
            if (resp.status === 200) message.success("详情刷新请求已发送");
        });
    };

    const handleShowInfo = useCallback((itemStack, dbItem) => {
        setInfoItem(itemStack);
        setInfoDbItem(dbItem);
        setInfoModalVisible(true);
    }, []);

    // Sort CPUs
    const sortedCpus = useMemo(() => {
        const sorted = [...cpus];
        switch (sortType) {
            case 'name_asc':
                sorted.sort((a, b) => a.id.localeCompare(b.id));
                break;
            case 'name_desc':
                sorted.sort((a, b) => b.id.localeCompare(a.id));
                break;
            case 'storage_desc':
                sorted.sort((a, b) => (b.storage || 0) - (a.storage || 0));
                break;
            case 'status':
                // Busy first
                sorted.sort((a, b) => (b.busy ? 1 : 0) - (a.busy ? 1 : 0));
                break;
            default:
                break;
        }
        return sorted;
    }, [cpus, sortType]);

    return (
        <Card 
            title={
                <Space>
                    <span>AE 合成 CPU 管理</span>
                    {monitoring && <Tag icon={<EyeOutlined />} color="processing">实时监控中</Tag>}
                </Space>
            }
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                <Space style={{ flexWrap: 'wrap' }}>
                    <Button icon={<CloudSyncOutlined />} onClick={() => handleCommand("simpleCpusInfo")}>更新简要信息</Button>
                    <Button icon={<ReloadOutlined />} onClick={() => handleCommand("allCpusInfo")}>更新详细信息</Button>
                    <Button type="primary" icon={<LineChartOutlined />} onClick={() => handleCommand("cpuMonitor")}>添加实时监控</Button>
                    <Button danger icon={<StopOutlined />} onClick={() => handleCommand("cancelMonitor", { id: "cpuMonitor" })}>停止监控</Button>
                </Space>
                <div style={{ marginTop: 8 }}>
                    <span style={{ marginRight: 8 }}>排序方式:</span>
                    <Select 
                        defaultValue="name_asc" 
                        style={{ width: 160 }} 
                        onChange={setSortType}
                        suffixIcon={<SortAscendingOutlined />}
                    >
                        <Option value="name_asc">名称 (A-Z)</Option>
                        <Option value="name_desc">名称 (Z-A)</Option>
                        <Option value="storage_desc">容量 (大-小)</Option>
                        <Option value="status">状态 (忙碌优先)</Option>
                    </Select>
                </div>
            </div>

            {sortedCpus.length === 0 ? (
                <Empty description="暂无 CPU 信息，请确保已使用石英刀命名且名称唯一" />
            ) : (
                <div className="ae-cpu-card-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {sortedCpus.map(cpu => (
                        <AeCpuCard 
                            key={cpu.id} 
                            cpu={cpu} 
                            onClick={() => setSelectedCpu(cpu)} 
                            onRefresh={() => handleRefreshDetail(cpu.id)}
                            onDelete={() => handleDeleteCpu(cpu)}
                        />
                    ))}
                </div>
            )}

            <CpuDetail cpu={selectedCpu} onShowInfo={handleShowInfo} />

            {/* Info Modal */}
            <Modal
                title="物品详情"
                open={infoModalVisible}
                onCancel={() => setInfoModalVisible(false)}
                footer={[<Button key="close" type="primary" onClick={() => setInfoModalVisible(false)}>关闭</Button>]}
                width={600}
            >
                {infoItem && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                         <div style={{ display: 'flex', gap: 16 }}>
                             <ItemStack itemStack={infoItem} />
                             <div style={{ flex: 1 }}>
                                <Descriptions column={1} size="small" bordered>
                                    <Descriptions.Item label="显示名称">{infoItem.label}</Descriptions.Item>
                                    <Descriptions.Item label="ID (Name)">{infoItem.name}</Descriptions.Item>
                                    <Descriptions.Item label="Meta">{infoItem.damage}</Descriptions.Item>
                                    <Descriptions.Item label="数量">{infoItem.size || infoItem.amount}</Descriptions.Item>
                                </Descriptions>
                             </div>
                         </div>
                         <Divider orientation="left">原始数据 (JSON)</Divider>
                         <Input.TextArea 
                            value={JSON.stringify(infoItem, null, 2)} 
                            autoSize={{ minRows: 4, maxRows: 10 }} 
                            readOnly 
                         />
                    </div>
                )}
            </Modal>
        </Card>
    );
}
