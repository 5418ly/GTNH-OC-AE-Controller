import React, { useState, useEffect, useContext } from 'react';
import { Form, Input, Button, Checkbox, Select, Alert, Modal, Typography, message, Space, Card } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, SettingOutlined } from '@ant-design/icons';
import { ThemeContext } from '../../contexts/ThemeContext';
import CommandUtil from '../../commons/CommandUtil';
import Config from '../../Config';

const { Option } = Select;
const { Text, Paragraph } = Typography;

const getOCConfig = (token, baseUrl) => {
    return `return {
    sleep = 10,                     -- 两次执行任务时间隔多少秒
    token = "${token || ''}",             -- token
    baseUrl = "${baseUrl || ''}",         -- 基础 url
    path = {                        -- 各项数据路径
        task = "/task",             -- 任务数据所在路径
        cpu = "/cpus",              -- cpu
        essentia = "/essentia",     -- 源质
        fluids = "/fluids",         -- 流体
        items = "/items"            -- 物品
    }
}`;
};

export default function ConfigPage() {
    const [form] = Form.useForm();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    
    // Initial values from localStorage
    const [initialValues, setInitialValues] = useState({
        baseUrl: localStorage.getItem("base-url") || "",
        token: localStorage.getItem("ocaetoken") || "",
        theme: localStorage.getItem("theme") || "light"
    });

    const handleSave = (values) => {
        if (values.baseUrl) localStorage.setItem("base-url", values.baseUrl);
        if (values.token) localStorage.setItem("ocaetoken", values.token);
        
        // Theme is handled by Context, but we sync it here too just in case user selected it manually
        // Note: The select below calls toggleTheme directly, so maybe we don't need to save it here explicitly
        // unless we want to support more than 2 themes later.
        
        CommandUtil.resetNow();
        message.success("成功保存配置到浏览器本地！");
    };

    const showOCConfig = () => {
        setIsModalVisible(true);
    };

    const currentBaseUrl = Form.useWatch('baseUrl', form);
    const showHttpWarning = currentBaseUrl && !currentBaseUrl.startsWith("https") && window.location.protocol === 'https:';

    return (
        <Card title="系统设置" style={{ maxWidth: 800, margin: '0 auto' }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={initialValues}
                onFinish={handleSave}
            >
                <Form.Item
                    label="基础 URL (Backend URL)"
                    name="baseUrl"
                    help="后端服务器地址，例如 http://localhost:8080"
                >
                    <Input.Password 
                        placeholder="请输入后端地址" 
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                </Form.Item>

                {showHttpWarning && (
                    <Alert
                        message="HTTPS 混合内容警告"
                        description={
                            <span>
                                您想使用 HTTP 接口，但访问本站的方式为 HTTPS。这可能会导致请求被浏览器拦截。
                                <a href={window.location.href.replace("https:", "http:")}> 点击此处以 HTTP 方式访问本站 </a>
                            </span>
                        }
                        type="warning"
                        showIcon
                        style={{ marginBottom: 24 }}
                    />
                )}

                <Form.Item
                    label="Token (OC AE Token)"
                    name="token"
                >
                    <Input.Password placeholder="请输入 Token" />
                </Form.Item>

                <Form.Item
                    label="主题 (Theme)"
                    name="theme"
                >
                    <Select 
                        onChange={(value) => {
                            // Sync with context
                            if ((value === 'dark' && !isDarkMode) || (value !== 'dark' && isDarkMode)) {
                                toggleTheme();
                            }
                        }}
                    >
                        <Option value="light">Light (白)</Option>
                        <Option value="dark">Dark (黑)</Option>
                    </Select>
                </Form.Item>

                <Form.Item>
                    <Space>
                        <Button type="primary" htmlType="submit" icon={<SettingOutlined />}>
                            保存配置
                        </Button>
                        <Button onClick={showOCConfig}>
                            查看 OC 配置
                        </Button>
                    </Space>
                </Form.Item>
            </Form>

            <Modal
                title="OpenComputers 配置代码"
                open={isModalVisible}
                onOk={() => setIsModalVisible(false)}
                onCancel={() => setIsModalVisible(false)}
                width={700}
                footer={[
                    <Button key="copy" onClick={() => {
                        const code = getOCConfig(form.getFieldValue('token'), form.getFieldValue('baseUrl'));
                        navigator.clipboard.writeText(code);
                        message.success("代码已复制到剪贴板");
                    }}>
                        复制
                    </Button>,
                    <Button key="close" type="primary" onClick={() => setIsModalVisible(false)}>
                        关闭
                    </Button>,
                ]}
            >
                <Paragraph>将以下代码复制到游戏内 OpenComputers 的配置文件中 (config.lua):</Paragraph>
                <pre style={{ backgroundColor: '#f5f5f5', padding: 12, borderRadius: 4, overflow: 'auto' }}>
                    <code>
                        {getOCConfig(form.getFieldValue('token'), form.getFieldValue('baseUrl'))}
                    </code>
                </pre>
            </Modal>
        </Card>
    );
}
