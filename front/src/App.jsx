import React, { useContext } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import MainLayout from './layouts/MainLayout';
import { ThemeProvider, ThemeContext } from './contexts/ThemeContext';

// Pages
import ItemsPage from './pages/ItemsPage/ItemsPage';
import ConfigPage from './pages/ConfigPage/ConfigPage';
import IndexPage from './pages/IndexPage/IndexPage';
import FluidPage from './pages/FluidPage/FluidPage';
import EssentiaPage from './pages/EssentiaPage/EssentiaPage';
import CpuPage from './pages/CpuPage/CpuPage';
import ApplyPage from './pages/ApplyPage/ApplyPage';
import DocsPage from './pages/DocsPage/DocsPage';

// Wrapper to consume ThemeContext for ConfigProvider
const AppContent = () => {
    const { isDarkMode } = useContext(ThemeContext);
    
    return (
        <ConfigProvider
            locale={zhCN}
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#1677ff',
                },
            }}
        >
            <HashRouter>
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<IndexPage />} />
                        <Route path="items" element={<ItemsPage />} />
                        <Route path="fluids" element={<FluidPage />} />
                        <Route path="essentia" element={<EssentiaPage />} />
                        <Route path="cpus" element={<CpuPage />} />
                        <Route path="config" element={<ConfigPage />} />
                        <Route path="apply" element={<ApplyPage />} />
                        <Route path="docs" element={<DocsPage />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Route>
                </Routes>
            </HashRouter>
        </ConfigProvider>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}
