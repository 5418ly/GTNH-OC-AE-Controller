import React, { memo } from 'react';
import PropTypes from "prop-types";
import { Card, Typography, Tag, Tooltip, Button, Space, theme } from 'antd';
import { SyncOutlined, DeleteOutlined, DatabaseOutlined, ClusterOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

// 使用 memo 优化，只在 props 变化时重新渲染
const AeCpuCard = memo(function AeCpuCard({ onClick, cpu, onRefresh, onDelete, selected }) {
    const { token } = theme.useToken();
    
    // Determine status styling
    const isBusy = cpu.busy;
    const statusColor = isBusy ? "processing" : "success";
    const statusText = isBusy ? "运行中" : "空闲";
    const StatusIcon = isBusy ? ClockCircleOutlined : CheckCircleOutlined;

    // Handle card click (select)
    const handleCardClick = () => {
        if (onClick) onClick(cpu);
    };

    // Prevent bubbling for actions
    const handleAction = (e, action) => {
        e.stopPropagation();
        action();
    };

    // 格式化存储容量
    const formatStorage = (storage) => {
        if (!storage) return "0";
        if (storage >= 1024 * 1024) {
            return `${(storage / 1024 / 1024).toFixed(1)} M`;
        }
        return `${(storage / 1024).toFixed(0)} K`;
    };

    return (
        <Card
            hoverable
            onClick={handleCardClick}
            size="small"
            style={{ 
                width: 200, 
                borderColor: selected 
                    ? token.colorPrimary 
                    : isBusy 
                        ? token.colorWarning 
                        : token.colorBorder,
                borderWidth: selected ? 2 : 1,
                backgroundColor: selected ? token.colorPrimaryBg : undefined,
                transition: 'all 0.2s ease'
            }}
            styles={{
                body: { padding: '12px' }
            }}
            title={
                <Tooltip title={cpu.id}>
                    <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                    }}>
                        <StatusIcon style={{ color: isBusy ? token.colorProcessing : token.colorSuccess }} />
                        <span>{cpu.id}</span>
                    </div>
                </Tooltip>
            }
            extra={
                <Tag 
                    color={statusColor}
                    icon={<SyncOutlined spin={isBusy} />}
                >
                    {statusText}
                </Tag>
            }
            actions={[
                <Tooltip title="刷新状态" key="refresh">
                    <Button 
                        type="text" 
                        icon={<SyncOutlined />} 
                        onClick={(e) => handleAction(e, () => onRefresh(cpu.id))} 
                    />
                </Tooltip>,
                <Tooltip title="删除 CPU" key="delete">
                    <Button 
                        type="text" 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={(e) => handleAction(e, () => onDelete(cpu))} 
                    />
                </Tooltip>
            ]}
        >
            <Space direction="vertical" style={{ width: '100%' }} size={4}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={4} style={{ color: token.colorTextSecondary }}>
                        <DatabaseOutlined />
                        <Text type="secondary" style={{ fontSize: 12 }}>容量</Text>
                    </Space>
                    <Text strong>{formatStorage(cpu.storage)}</Text>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={4} style={{ color: token.colorTextSecondary }}>
                        <ClusterOutlined />
                        <Text type="secondary" style={{ fontSize: 12 }}>并行</Text>
                    </Space>
                    <Text strong>{cpu.coprocessors || 0}</Text>
                </div>

                {/* 显示合成进度（如果有） */}
                {isBusy && cpu.cpu && cpu.cpu.activeItems && cpu.cpu.activeItems.length > 0 && (
                    <div style={{ 
                        marginTop: 4, 
                        paddingTop: 8, 
                        borderTop: `1px solid ${token.colorBorderSecondary}` 
                    }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            正在合成: {cpu.cpu.activeItems.length} 种物品
                        </Text>
                    </div>
                )}
            </Space>
        </Card>
    );
}, (prevProps, nextProps) => {
    // 自定义比较函数，只在关键属性变化时重新渲染
    const prevCpu = prevProps.cpu;
    const nextCpu = nextProps.cpu;
    
    return (
        prevProps.selected === nextProps.selected &&
        prevCpu.id === nextCpu.id &&
        prevCpu.busy === nextCpu.busy &&
        prevCpu.storage === nextCpu.storage &&
        prevCpu.coprocessors === nextCpu.coprocessors &&
        // 检查 activeItems 长度变化
        (prevCpu.cpu?.activeItems?.length === nextCpu.cpu?.activeItems?.length)
    );
});

AeCpuCard.propTypes = {
    onClick: PropTypes.func,
    cpu: PropTypes.object.isRequired,
    onRefresh: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    selected: PropTypes.bool
};

AeCpuCard.defaultProps = {
    selected: false
};

export default AeCpuCard;