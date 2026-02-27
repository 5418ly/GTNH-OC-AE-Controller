import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { Card, Button, Space, Typography, Empty, Divider, message, Modal, Descriptions, Input, Select, Tag, Spin, Tooltip } from "antd";
import { CloudSyncOutlined, LineChartOutlined, StopOutlined, ReloadOutlined, SortAscendingOutlined, EyeOutlined, SyncOutlined } from "@ant-design/icons";
import httpUtil from "../../HttpUtil.jsx";
import AeCpuCard from "../../components/AeCpuCard/AeCpuCard.jsx";
import ItemStack from "../../components/itemStack/ItemStack.jsx";
import CommandUtil from "../../commons/CommandUtil.jsx";
import "./CpuPage.css"

const { Title, Text } = Typography;
const { Option } = Select;

// 深度比较两个 CPU 对象是否相等
function deepEqualCpu(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    
    // 比较基本字段
    if (a.id !== b.id || a.busy !== b.busy || a.storage !== b.storage || a.coprocessors !== b.coprocessors) {
        return false;
    }
    
    // 比较 cpu 详情
    const cpuA = a.cpu;
    const cpuB = b.cpu;
    
    if (!cpuA && !cpuB) return true;
    if (!cpuA || !cpuB) return false;
    
    // 比较详情中的数组长度
    const activeA = cpuA.activeItems || [];
    const activeB = cpuB.activeItems || [];
    const pendingA = cpuA.pendingItems || [];
    const pendingB = cpuB.pendingItems || [];
    const storedA = cpuA.storedItems || [];
    const storedB = cpuB.storedItems || [];
    
    if (activeA.length !== activeB.length || pendingA.length !== pendingB.length || storedA.length !== storedB.length) {
        return false;
    }
    
    return true;
}

// 智能合并 CPU 列表，只在数据真正变化时返回新数组
function mergeCpus(prevCpus, newCpus) {
    if (!newCpus || newCpus.length === 0) return prevCpus;
    
    let hasChanges = false;
    const merged = newCpus.map(newCpu => {
        const oldCpu = prevCpus.find(c => c.id === newCpu.id);
        
        if (!oldCpu) {
            hasChanges = true;
            return newCpu;
        }
        
        // 如果新数据有详情但旧数据没有，合并详情
        if (newCpu.cpu && newCpu.cpu.activeItems && (!oldCpu.cpu || !oldCpu.cpu.activeItems)) {
            hasChanges = true;
            return newCpu;
        }
        
        // 检查是否有变化
        if (!deepEqualCpu(oldCpu, newCpu)) {
            hasChanges = true;
            return { ...oldCpu, ...newCpu };
        }
        
        return oldCpu;
    });
    
    // 检查是否有删除的 CPU
    if (prevCpus.length !== newCpus.length) {
        hasChanges = true;
    }
    
    return hasChanges ? merged : prevCpus;
}

function CpuDetail({ cpu, onShowInfo, loading }) {
    if (!cpu) {
        return (
            <Card style={{ marginTop: 24 }}>
                <Empty description="请选择一个 CPU 查看详情" />
            </Card>
        );
    }
    
    const cpuData = cpu.cpu || {};
    const activeItems = cpuData.activeItems || [];
    const pendingItems = cpuData.pendingItems || [];
    const storedItems = cpuData.storedItems || [];

    const renderItemList = (items, title) => (
        <Card size="small" title={title} style={{ marginBottom: 16 }} loading={loading}>
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
            <Title level={4}>
                <Space>
                    {cpu.id} 详细信息
                    {cpu.busy && <Tag color="processing">运行中</Tag>}
                </Space>
            </Title>
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
    // 使用 useRef 存储上一次的数据，避免不必要的重渲染
    const cpusRef = useRef([]);
    const [cpus, setCpus] = useState([]);
    const [selectedCpu, setSelectedCpu] = useState(null);
    const [lastModified, setLastModified] = useState("");
    const [monitoring, setMonitoring] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    
    // Sort State
    const [sortType, setSortType] = useState('name_asc');

    // Info Modal State
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoItem, setInfoItem] = useState(null);
    const [infoDbItem, setInfoDbItem] = useState(null);

    // 使用 useRef 跟踪是否正在获取数据
    const fetchingRef = useRef(false);

    const fetchCpus = useCallback(async () => {
        if (!CommandUtil.canFetchData() || fetchingRef.current) return;
        
        fetchingRef.current = true;
        try {
            const resp = await httpUtil.get(httpUtil.path.cpus, lastModified ? { "If-Modified-Since": lastModified } : {});
            
            if (resp.status === 200) {
                const data = await resp.json();
                
                // 使用智能合并，只在数据真正变化时更新
                setCpus(prevCpus => {
                    const merged = mergeCpus(prevCpus, data);
                    cpusRef.current = merged;
                    return merged;
                });

                const newLastModified = resp.headers.get("last-modified");
                if (newLastModified) {
                    setLastModified(newLastModified);
                }
            } else if (resp.status === 304) {
                // 数据未修改，不做任何更新
            }
        } catch (error) {
            console.error("Failed to fetch CPUs:", error);
        } finally {
            fetchingRef.current = false;
        }
    }, [lastModified]);

    // 初始化和定时刷新
    useEffect(() => {
        // 初始获取数据
        const initFetch = async () => {
            setRefreshing(true);
            try {
                // 先触发后端更新
                CommandUtil.submitCommand("simpleCpusInfo", {});
                
                // 等待一小段时间让 OC 端处理
                await new Promise(resolve => setTimeout(resolve, 500));
                
                const resp = await httpUtil.get(httpUtil.path.cpus);
                if (resp.status === 200) {
                    const data = await resp.json();
                    setCpus(data);
                    cpusRef.current = data;
                }
            } catch (error) {
                console.error("Init fetch failed:", error);
            } finally {
                setRefreshing(false);
            }
        };
        
        initFetch();

        // 定时刷新 - 增加间隔到 3 秒
        const timer = setInterval(fetchCpus, 3000);
        return () => clearInterval(timer);
    }, []);

    // 更新选中的 CPU 详情 - 使用 ref 避免不必要的更新
    useEffect(() => {
        if (selectedCpu) {
            const updated = cpus.find(c => c.id === selectedCpu.id);
            // 只在数据真正变化时更新
            if (updated && !deepEqualCpu(updated, selectedCpu)) {
                setSelectedCpu(updated);
            }
        }
    }, [cpus, selectedCpu]);

    const handleCommand = useCallback(async (method, data = {}, successMsg = "请求已发送") => {
        try {
            await httpUtil.put(httpUtil.path.task, { method, data });
            message.info(successMsg);
            if (method === "cpuMonitor") setMonitoring(true);
            if (method === "cancelMonitor") setMonitoring(false);
        } catch (error) {
            message.error("请求失败");
        }
    }, []);

    const handleDeleteCpu = useCallback((cpu) => {
        if (!cpu || !cpu.id) return;
        Modal.confirm({
            title: '确认删除',
            content: `是否删除 ${cpu.id} 的信息？`,
            onOk: async () => {
                try {
                    const resp = await httpUtil.delete(httpUtil.path.cpus + "/" + cpu.id);
                    if (resp.status === 200) {
                        message.success("已删除");
                        setCpus(prev => prev.filter(c => c.id !== cpu.id));
                        if (selectedCpu?.id === cpu.id) setSelectedCpu(null);
                    }
                } catch (error) {
                    message.error("删除失败");
                }
            }
        });
    }, [selectedCpu]);

    const handleRefreshDetail = useCallback(async (cpuId) => {
        setDetailLoading(true);
        try {
            await CommandUtil.submitCommand("cpuDetail", { id: cpuId });
            // 等待 OC 端处理
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 重新获取数据
            const resp = await httpUtil.get(httpUtil.path.cpus + "/" + cpuId);
            if (resp.status === 200) {
                const data = await resp.json();
                setCpus(prev => prev.map(c => c.id === cpuId ? { ...c, ...data } : c));
                if (selectedCpu?.id === cpuId) {
                    setSelectedCpu(prev => ({ ...prev, ...data }));
                }
                message.success("详情已刷新");
            }
        } catch (error) {
            message.error("刷新失败");
        } finally {
            setDetailLoading(false);
        }
    }, [selectedCpu]);

    const handleRefreshAll = useCallback(async () => {
        setRefreshing(true);
        try {
            await CommandUtil.submitCommand("allCpusInfo", {});
            message.info("已请求更新所有 CPU 信息");
        } finally {
            setTimeout(() => setRefreshing(false), 2000);
        }
    }, []);

    const handleShowInfo = useCallback((itemStack, dbItem) => {
        setInfoItem(itemStack);
        setInfoDbItem(dbItem);
        setInfoModalVisible(true);
    }, []);

    // 选择 CPU - 使用 useCallback
    const handleSelectCpu = useCallback((cpu) => {
        setSelectedCpu(cpu);
    }, []);

    // Sort CPUs - 使用 useMemo
    const sortedCpus = useMemo(() => {
        const sorted = [...cpus];
        switch (sortType) {
            case 'name_asc':
                sorted.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
                break;
            case 'name_desc':
                sorted.sort((a, b) => (b.id || '').localeCompare(a.id || ''));
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

    // 统计信息
    const stats = useMemo(() => {
        const total = cpus.length;
        const busy = cpus.filter(c => c.busy).length;
        const totalStorage = cpus.reduce((sum, c) => sum + (c.storage || 0), 0);
        return { total, busy, idle: total - busy, totalStorage };
    }, [cpus]);

    return (
        <Card 
            title={
                <Space>
                    <span>AE 合成 CPU 管理</span>
                    {monitoring && <Tag icon={<EyeOutlined />} color="processing">实时监控中</Tag>}
                    <Tag color="blue">{stats.total} 个 CPU</Tag>
                    <Tag color="orange">{stats.busy} 运行中</Tag>
                    <Tag color="green">{stats.idle} 空闲</Tag>
                </Space>
            }
            extra={
                <Space>
                    <Select 
                        value={sortType}
                        style={{ width: 160 }} 
                        onChange={setSortType}
                        suffixIcon={<SortAscendingOutlined />}
                    >
                        <Option value="name_asc">名称 (A-Z)</Option>
                        <Option value="name_desc">名称 (Z-A)</Option>
                        <Option value="storage_desc">容量 (大-小)</Option>
                        <Option value="status">状态 (忙碌优先)</Option>
                    </Select>
                </Space>
            }
        >
            <div style={{ marginBottom: 24 }}>
                <Space style={{ flexWrap: 'wrap' }}>
                    <Button 
                        icon={<CloudSyncOutlined />} 
                        onClick={() => handleCommand("simpleCpusInfo")}
                        loading={refreshing}
                    >
                        更新简要信息
                    </Button>
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={handleRefreshAll}
                        loading={refreshing}
                    >
                        更新详细信息
                    </Button>
                    <Button 
                        type="primary" 
                        icon={<LineChartOutlined />} 
                        onClick={() => handleCommand("cpuMonitor")}
                        disabled={monitoring}
                    >
                        添加实时监控
                    </Button>
                    <Button 
                        danger 
                        icon={<StopOutlined />} 
                        onClick={() => handleCommand("cancelMonitor", { id: "cpuMonitor" })}
                        disabled={!monitoring}
                    >
                        停止监控
                    </Button>
                </Space>
            </div>

            <Spin spinning={refreshing} tip="正在获取 CPU 信息...">
                {sortedCpus.length === 0 ? (
                    <Empty description="暂无 CPU 信息，请确保已使用石英刀命名且名称唯一" />
                ) : (
                    <div className="ae-cpu-card-panel" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                        {sortedCpus.map(cpu => (
                            <AeCpuCard 
                                key={cpu.id} 
                                cpu={cpu} 
                                onClick={() => handleSelectCpu(cpu)} 
                                onRefresh={() => handleRefreshDetail(cpu.id)}
                                onDelete={() => handleDeleteCpu(cpu)}
                                selected={selectedCpu?.id === cpu.id}
                            />
                        ))}
                    </div>
                )}
            </Spin>

            <CpuDetail cpu={selectedCpu} onShowInfo={handleShowInfo} loading={detailLoading} />

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