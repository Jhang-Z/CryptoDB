import React, { useState } from 'react';

import LoginPage from './LoginPage';
import CryptoDBPanel from './CryptoDBPanel';
import DataOwnerPanel from './DataOwnerPanel'; // 新增数据拥有者面板
import RoleSelector from './RoleSelector'; // 新增角色选择器

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentRole, setCurrentRole] = useState(null); // 'user' 或 'owner'

  const handleLoginSuccess = (role) => {
    setCurrentRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentRole(null);
  };

  const handleRoleSelect = (role) => {
    setCurrentRole(role);
  };

  return (
    <div>
      {isLoggedIn ? (
        currentRole === 'user' ? (
          <CryptoDBPanel onLogout={handleLogout} />
        ) : (
          <DataOwnerPanel onLogout={handleLogout} />
        )
      ) : currentRole ? (
        <LoginPage 
          onLoginSuccess={() => handleLoginSuccess(currentRole)} 
          onBack={() => setCurrentRole(null)}
          role={currentRole}
        />
      ) : (
        <RoleSelector onRoleSelect={handleRoleSelect} />
      )}
    </div>
  );
}

export default App;