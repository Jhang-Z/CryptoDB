import React from 'react';
import './RoleSelector.css';

function RoleSelector({ onRoleSelect }) {
  return (
    <div className="role-selector-container">
      <div className="role-selector-box">
        <h2>🔐 CryptoDB - 选择身份</h2>
        <div className="role-cards">
          <div className="role-card" onClick={() => onRoleSelect('user')}>
            <div className="role-icon">👤</div>
            <h3>查询者</h3>
            <p>发送查询语句,进行数据分析</p>
            <button className="role-select-btn">选择</button>
          </div>
          
          <div className="role-card" onClick={() => onRoleSelect('owner')}>
            <div className="role-icon">🏢</div>
            <h3>数据拥有者</h3>
            <p>加密数据库和云同步操作</p>
            <button className="role-select-btn">选择</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleSelector;