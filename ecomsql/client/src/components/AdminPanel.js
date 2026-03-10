import React, { useState } from 'react';
import RoleManagement from './RoleManagement';
import './AdminPanel.css';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('roles');

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>🔐 Admin Panel</h1>
        <p>System Administration & Control</p>
      </div>

      <div className="admin-tabs">
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          👥 Role Management
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          disabled
        >
          ⚙️ Settings
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'roles' && (
          <div className="tab-content">
            <RoleManagement />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="coming-soon">
              <p>Settings coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
