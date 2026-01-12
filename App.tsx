
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import InventoryPanel from './components/InventoryPanel.tsx';
import SalesPanel from './components/SalesPanel.tsx';
import CustomersPanel from './components/CustomersPanel.tsx';
import RouteOptimizer from './components/RouteOptimizer.tsx';
import SellerApp from './components/SellerApp.tsx';
import SetupPanel from './components/SetupPanel.tsx';
import { dbService } from './services/db.ts';

const App: React.FC = () => {
  useEffect(() => {
    dbService.init();
  }, []);

  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inventory" element={<InventoryPanel />} />
          <Route path="/sales" element={<SalesPanel />} />
          <Route path="/customers" element={<CustomersPanel />} />
          <Route path="/routes" element={<RouteOptimizer />} />
          <Route path="/seller-app" element={<SellerApp />} />
          <Route path="/setup" element={<SetupPanel />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
};

export default App;
