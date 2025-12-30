import React, { useState, useContext, useEffect } from 'react';
import { Layout, Menu, Button, Switch, theme, Typography, Drawer, FloatButton } from 'antd';
import { 
    HomeOutlined, 
    AppstoreOutlined, 
    ExperimentOutlined, 
    ThunderboltOutlined, 
    SettingOutlined, 
    RocketOutlined, 
    CodeOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    ConsoleSqlOutlined,
    ReadOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import CommandConsoleAntd from '../components/CommandConsole/CommandConsoleAntd';
import CommandUtil from '../commons/CommandUtil';
import { ThemeContext } from '../contexts/ThemeContext';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [consoleVisible, setConsoleVisible] = useState(false);
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    const navigate = useNavigate();
    const location = useLocation();
    
    const {
        token: { colorBgContainer, borderRadiusLG },
    } = theme.useToken();

    // Reset command utility on page change
    useEffect(() => {
        CommandUtil.resetNow();
    }, [location]);

    const items = [
        { key: '/', icon: <HomeOutlined />, label: '首页' },
        { key: '/items', icon: <AppstoreOutlined />, label: '物品终端' },
        { key: '/fluids', icon: <ExperimentOutlined />, label: '流体终端' },
        { key: '/essentia', icon: <ThunderboltOutlined />, label: '源质终端' },
        { key: '/cpus', icon: <CodeOutlined />, label: 'CPU 管理' },
        { key: '/config', icon: <SettingOutlined />, label: '配置' },
        { key: '/apply', icon: <RocketOutlined />, label: '申请/其他' },
        { key: '/docs', icon: <ReadOutlined />, label: '使用文档' },
    ];

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {!collapsed && <Text style={{ color: 'white', fontWeight: 'bold' }}>GTNH AE Panel</Text>}
                    {collapsed && <Text style={{ color: 'white', fontWeight: 'bold' }}>AE</Text>}
                </div>
                <Menu
                    theme="dark"
                    mode="inline"
                    selectedKeys={[location.pathname]}
                    onClick={({ key }) => navigate(key)}
                    items={items}
                />
            </Sider>
            <Layout>
                <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
                    <Button
                        type="text"
                        icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                        onClick={() => setCollapsed(!collapsed)}
                        style={{
                            fontSize: '16px',
                            width: 64,
                            height: 64,
                        }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <Button 
                            icon={<ConsoleSqlOutlined />} 
                            onClick={() => setConsoleVisible(true)}
                        >
                            控制台
                        </Button>
                        <Switch 
                            checkedChildren="Dark" 
                            unCheckedChildren="Light" 
                            checked={isDarkMode} 
                            onChange={toggleTheme} 
                        />
                    </div>
                </Header>
                <Content
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        background: colorBgContainer,
                        borderRadius: borderRadiusLG,
                        overflow: 'auto'
                    }}
                >
                    <Drawer
                        title="控制台"
                        placement="right"
                        onClose={() => setConsoleVisible(false)}
                        open={consoleVisible}
                        size="default"
                        style={{ width: 500 }}
                    >
                        <CommandConsoleAntd />
                    </Drawer>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;
