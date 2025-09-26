import React, { useState } from 'react';
import './LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      alert('请输入用户名和密码');
      return;
    }

    if (username === 'admin' && password === '123456') {
      // 登录成功
      setShowSuccessModal(true);

      // 2秒后自动关闭成功弹窗，并通知登录成功，跳转主页
      setTimeout(() => {
        setShowSuccessModal(false);
        if (onLoginSuccess) {
          onLoginSuccess(); // 通知 App.js，登录成功，进入主界面
        }
      }, 500);

    } else {
      // 登录失败
      setShowErrorModal(true);

      // 3秒后自动关闭失败弹窗
      setTimeout(() => {
        setShowErrorModal(false);
      }, 1000);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h2>🔐 用户登录</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">用户名</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>
          <button type="submit" className="login-btn">
            登录
          </button>
        </form>
      </div>

      {/* ✅ 登录成功弹窗 */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>✅ 登录成功！</h3>
            <p>正在进入系统...</p>
          </div>
        </div>
      )}

      {/* ✅ 登录失败弹窗 */}
      {showErrorModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>❌ 登录失败</h3>
            <p>用户名或密码错误，请重试。</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPage;