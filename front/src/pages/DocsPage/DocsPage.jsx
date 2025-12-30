import React from 'react';
import { Typography, Card, Collapse, Space, Steps, Divider, Tag } from 'antd';
import { 
    AppstoreOutlined, 
    ExperimentOutlined, 
    CodeOutlined, 
    SettingOutlined, 
    CloudSyncOutlined,
    RocketOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

export default function DocsPage() {
    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Card style={{ marginBottom: 24 }}>
                <Title level={2}>GTNH OC AE 控制面板使用文档</Title>
                <Paragraph>
                    欢迎使用 GTNH OC AE 控制面板。本项目通过 OpenComputers 模组与 Applied Energistics 2 (AE2) 模组进行交互，
                    实现远程管理 AE 网络中的物品、流体、源质以及合成 CPU。
                </Paragraph>
                <Divider />
                
                <Title level={4}>快速开始</Title>
                <Steps
                    current={-1}
                    direction="vertical"
                    items={[
                        {
                            title: '配置连接',
                            description: '首次使用请进入“配置”页面，填写后端地址（如 http://localhost:8080）和 Token。',
                        },
                        {
                            title: '安装 OC 程序',
                            description: '在配置页面点击“查看 OC 配置”，复制 Lua 代码到游戏内 OpenComputers 的电脑中运行。',
                        },
                        {
                            title: '开始使用',
                            description: '连接成功后，即可在各个终端页面查看和管理 AE 网络。',
                        },
                    ]}
                />
            </Card>

            <Collapse defaultActiveKey={['1', '2', '3']}>
                <Panel header={<Space><AppstoreOutlined /> <Text strong>物品终端 (Items)</Text></Space>} key="1">
                    <Paragraph>
                        查看 AE 网络中存储的所有物品。
                    </Paragraph>
                    <ul>
                        <li><Text strong>搜索</Text>: 支持按物品 ID、显示名称 (Label)、Meta 值进行过滤。</li>
                        <li><Text strong>详情</Text>: 点击物品图标上的 <Tag icon={<span role="img" aria-label="info">ℹ️</span>} /> 图标查看完整信息（NBT等）。</li>
                        <li><Text strong>合成</Text>: 如果物品可合成，图标右上角会显示锤子图标。点击即可发起合成请求，支持指定数量和合成 CPU。</li>
                        <li><Text strong>缓存清理</Text>: 如果显示数据与游戏不一致，可点击顶部的“清理所有物品”重置缓存。</li>
                        <li><Text strong>搜寻可制造</Text>: 强制刷新后端缓存的可制造物品列表。</li>
                    </ul>
                </Panel>
                
                <Panel header={<Space><ExperimentOutlined /> <Text strong>流体与源质终端 (Fluids & Essentia)</Text></Space>} key="2">
                    <Paragraph>
                        功能与物品终端类似，分别用于管理 AE 网络中的流体（Fluid）和神秘时代源质（Essentia）。
                    </Paragraph>
                    <ul>
                        <li><Text strong>单位</Text>: 流体单位为 mB (毫桶)，源质单位为点数。</li>
                        <li><Text strong>合成</Text>: 同样支持对可合成的流体/源质发起自动合成请求。</li>
                    </ul>
                </Panel>

                <Panel header={<Space><CodeOutlined /> <Text strong>CPU 管理 (CPUs)</Text></Space>} key="3">
                    <Paragraph>
                        管理 AE 网络的合成处理单元 (Crafting CPU)。
                    </Paragraph>
                    <ul>
                        <li><Text strong>卡片状态</Text>: <Tag color="processing">运行中</Tag> 表示 CPU 正在执行任务，<Tag color="success">空闲</Tag> 表示可用。</li>
                        <li><Text strong>刷新状态</Text>: 点击卡片上的刷新按钮，或顶部的“更新简要信息”来获取最新状态。</li>
                        <li><Text strong>详细信息</Text>: 点击 CPU 卡片，下方会显示该 CPU 当前正在合成、等待合成以及缓存的物品列表。</li>
                        <li><Text strong>实时监控</Text>: 开启后前端会自动轮询后端状态（注意：会增加服务器负载）。</li>
                        <li><Text type="warning">注意</Text>: “更新详细信息”操作较为耗时，因为它会请求游戏内遍历所有 CPU 的完整任务列表。</li>
                    </ul>
                </Panel>

                <Panel header={<Space><SettingOutlined /> <Text strong>高级配置 (Config)</Text></Space>} key="4">
                    <Paragraph>
                        系统连接设置。
                    </Paragraph>
                    <ul>
                        <li><Text strong>基础 URL</Text>: 后端 Java 服务器的地址。如果使用 HTTPS 访问前端但后端是 HTTP，请留意浏览器的混合内容警告。</li>
                        <li><Text strong>Token</Text>: 安全验证令牌，需与游戏内 OC 电脑配置一致。</li>
                        <li><Text strong>OC 配置代码</Text>: 自动生成适配当前设置的 Lua 脚本，方便直接复制到游戏中使用。</li>
                    </ul>
                </Panel>
            </Collapse>
        </div>
    );
}
