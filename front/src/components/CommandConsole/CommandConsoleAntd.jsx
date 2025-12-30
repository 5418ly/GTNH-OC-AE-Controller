import React, { useState, useEffect, useCallback } from 'react';
import { Card, Select, Input, Button, Switch, Typography, Space, Row, Col, message } from 'antd';
import { SendOutlined, ReloadOutlined, BugOutlined } from '@ant-design/icons';
import Config from '../../Config';
import CommandUtil from '../../commons/CommandUtil';
import httpUtil from '../../HttpUtil';

const { TextArea } = Input;
const { Option } = Select;

const CommandConsoleAntd = () => {
    const [command, setCommand] = useState("");
    const [bodyData, setBodyData] = useState("");
    const [commandStatus, setCommandStatus] = useState("");
    const [lastModified, setLastModified] = useState("");
    const [isPolling, setIsPolling] = useState(true);

    // Load tasks from Config
    const commandOptions = Object.keys(Config.tasks).filter(key => key !== "none").map(key => (
        <Option key={key} value={key}>{key}</Option>
    ));

    const handleCommandSelect = (value) => {
        const task = Config.tasks[value];
        if (task) {
            setCommand(task.method);
            setBodyData(task.data);
        }
    };

    const handleSubmit = () => {
        CommandUtil.submitCommand(command, bodyData, (resp) => {
             if (resp.status === 200) {
                 message.success("指令已发送");
             } else {
                 message.error("指令发送失败");
             }
        });
    };

    const handleReset = () => {
        CommandUtil.resetNow();
        message.info("连接状态已刷新");
    };

    // Polling logic
    useEffect(() => {
        const timer = setInterval(() => {
            const canFetch = CommandUtil.canFetchData();
            setIsPolling(canFetch);
            
            if (!canFetch) return;

            const headers = lastModified && lastModified !== "" ? { "If-Modified-Since": lastModified } : {};
            
            httpUtil.get(httpUtil.path.task, headers)
                .then(async response => {
                    if (response.status === 200) {
                        const text = await response.text();
                        setCommandStatus(text);
                        setLastModified(response.headers.get("last-modified"));
                    }
                })
                .catch((error) => {
                    if (typeof error === "string") setCommandStatus(error);
                });
        }, 1000);

        return () => clearInterval(timer);
    }, [lastModified]);

    return (
        <Card 
            title={<Space><BugOutlined /><span>控制台</span></Space>} 
            size="small" 
            extra={
                <Space>
                    {!isPolling && <Text type="warning">同步已暂停</Text>}
                    <Button type="primary" icon={<ReloadOutlined />} onClick={handleReset} size="small">
                        刷新连接
                    </Button>
                </Space>
            }
            style={{ marginBottom: 16 }}
        >
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Space style={{ width: '100%' }} direction="vertical">
                        <Space style={{ width: '100%' }}>
                            <span style={{ whiteSpace: 'nowrap' }}>预设指令:</span>
                            <Select 
                                style={{ width: 200 }} 
                                placeholder="选择指令"
                                onChange={handleCommandSelect}
                            >
                                {commandOptions}
                            </Select>
                            <Button type="primary" icon={<SendOutlined />} onClick={handleSubmit}>
                                提交指令
                            </Button>
                        </Space>
                        
                        <Space direction="vertical" style={{ width: '100%' }}>
                           <Input 
                                addonBefore="Method" 
                                value={command} 
                                onChange={e => setCommand(e.target.value)} 
                                placeholder="Command Method"
                            />
                            <TextArea 
                                rows={4} 
                                value={bodyData} 
                                onChange={e => setBodyData(e.target.value)} 
                                placeholder="Command Parameters (JSON)"
                                style={{ fontFamily: 'monospace' }}
                            />
                        </Space>
                    </Space>
                </Col>
                <Col span={24}>
                    <Typography.Text strong>执行状态:</Typography.Text>
                    <TextArea 
                        readOnly 
                        value={(isPolling ? "" : "[已暂停同步] 点击刷新连接按钮继续...\n") + commandStatus} 
                        rows={6} 
                        style={{ marginTop: 8, fontFamily: 'monospace', backgroundColor: isPolling ? undefined : '#f5f5f5' }} 
                    />
                </Col>
            </Row>
        </Card>
    );
};

export default CommandConsoleAntd;
