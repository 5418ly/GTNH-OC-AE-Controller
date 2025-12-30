import React from 'react';
import PropTypes from "prop-types";
import { Card, Typography, Tag, Tooltip, Button, Space, theme } from 'antd';
import { SyncOutlined, DeleteOutlined, DatabaseOutlined, ClusterOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function AeCpuCard({ onClick, cpu, onRefresh, onDelete }) {
    const { token } = theme.useToken();
    
    // Determine status styling
    const isBusy = cpu.busy;
    const statusColor = isBusy ? "processing" : "success";
    const statusText = isBusy ? "运行中" : "空闲";

    // Handle card click (select)
    const handleCardClick = () => {
        if (onClick) onClick(cpu.id);
    };

    // Prevent bubbling for actions
    const handleAction = (e, action) => {
        e.stopPropagation();
        action();
    };

    return (
        <Card
            hoverable
            onClick={handleCardClick}
            size="small"
            style={{ 
                width: 200, 
                borderColor: isBusy ? token.colorPrimary : undefined,
                borderWidth: isBusy ? 2 : 1
            }}
            title={
                <Tooltip title={cpu.id}>
                    <div style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                    }}>
                        {cpu.id}
                    </div>
                </Tooltip>
            }
            extra={
                <Tag color={statusColor}>{statusText}</Tag>
            }
            actions={[
                <Tooltip title="刷新状态" key="refresh">
                    <Button 
                        type="text" 
                        icon={<SyncOutlined spin={isBusy} />} 
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
                    <Text strong>{(cpu.storage / 1024).toFixed(0)} K</Text>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Space size={4} style={{ color: token.colorTextSecondary }}>
                        <ClusterOutlined />
                        <Text type="secondary" style={{ fontSize: 12 }}>并行</Text>
                    </Space>
                    <Text strong>{cpu.coprocessors}</Text>
                </div>
            </Space>
        </Card>
    );
}

AeCpuCard.propTypes = {
    onClick: PropTypes.func,
    cpu: PropTypes.object,
    onRefresh: PropTypes.func,
    onDelete: PropTypes.func
}