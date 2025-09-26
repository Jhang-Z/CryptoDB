import React, { useState, useEffect,useRef } from 'react';
import './DataOwnerPanel.css';

function DataOwnerPanel({ onLogout }) {
  const [tables, setTables] = useState({});
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('Idle');
  const [statusMessages, setStatusMessages] = useState([]); // 新增状态消息


    // 创建 ref 用于状态输出容器
    const statusOutputRef = useRef(null);

  // 添加状态消息的函数
  const addStatusMessage = (message) => {
    setStatusMessages(prev => [...prev, `> ${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 清除状态消息的函数
  const handleClearStatus = () => {
    setStatusMessages([]);
    addStatusMessage('状态日志已清除');
  };

  // 当状态消息更新时，自动滚动到底部
    useEffect(() => {
      if (statusOutputRef.current) {
        statusOutputRef.current.scrollTop = statusOutputRef.current.scrollHeight;
      }
    }, [statusMessages]); // 当 statusMessages 变化时触发

  // ✅ 模拟数据库表数据（替代从 SQL 文件加载）
const mockTables = {
  user_credit: {
    columns: [
      { name: 'ID', type: 'VARCHAR(100)' },
      { name: 'credit_rank', type: 'INT' },
      { name: 'income', type: 'INT' },
      { name: 'age', type: 'INT' }
    ],
    data: [
      ["1", 6, 100000, 20],
      ["2", 5, 90000, 19],
      ["3", 6, 89700, 32],
      ["4", 6, 607000, 30],
      ["5", 5, 30070, 25],
      ["6", 6, 12070, 28],
       ["7", 6, 200800, 50],
      ["8", 6, 607000, 30],
      ["9", 5, 30070, 25],
      ["10", 5, 12070, 28],
      ["11", 6, 200800, 50],
      ["12", 5, 30070, 25],
      ["13", 5, 12070, 28],
      ["14", 6, 200800, 18],
      ["15", 5, 30070, 26],
      ["16", 5, 12070, 27],
      ["17", 6, 200800, 16],
      ["18", 6, 30070, 25],
      ["19", 5, 12070, 28],
    ]
  },
  user_stats: {
    columns: [
      { name: 'ID', type: 'VARCHAR(100)'},
      { name: `order_amount`, type: 'INT' },
      { name: `is_active`, type: 'INT' }
    ],
    data: [
        ["1", 3598, 1],
        ["2", 100, 0],
        ["3", 2549, 1],
        ["4", 21698, 1],
        ["5", 4985, 1],
        ["6", 3598, 1],
        ["7", 322, 0],
        ["8", 9816, 1],
        ["9", 3598, 1],
        ["10", 322, 0],
        ["11", 9816, 1],
        ["12", 3598, 1],
        ["13", 322, 0],
        ["14", 9816, 1],
        ["15", 9816, 1],
        ["16", 9816, 1],
        ["17", 3598, 1],
        ["18", 322, 0],
        ["19", 9816, 1],
        ["20", 9816, 1],
    ]
  },
  
      
  
};





const isInitialized = useRef(false); // 用于标记是否已经初始化过

useEffect(() => {
  if (isInitialized.current) return; // 如果已经初始化过，直接返回
  
  isInitialized.current = true; // 标记为已初始化

  const initializeDatabase = async () => {
    try {
      setLoading(true);
      addStatusMessage('开始初始化数据库...');
      
      const parsedTables = mockTables; 

      setTables(parsedTables);
      addStatusMessage(`成功加载 ${Object.keys(parsedTables).length} 个模拟表`);

      const tableNames = Object.keys(parsedTables);
      if (tableNames.length > 0) {
        setSelectedTable(tableNames[0]);
        const tableInfo = parsedTables[tableNames[0]];
        setTableData(formatTableData(tableInfo));
        setTableHeaders(tableInfo.columns.map(col => col.name));
        addStatusMessage(`默认选中表: ${tableNames[0]}`);
      }

      setLoading(false);
      addStatusMessage('数据库初始化完成');
    } catch (err) {
      console.error('初始化数据库失败:', err);
      setError(`初始化失败: ${err.message}`);
      setLoading(false);
    }
  };

  initializeDatabase();
}, []); // 依赖项仍然为空数组

  const handleTableChange = (tableName) => {
    setSelectedTable(tableName);
    const tableInfo = tables[tableName];
    if (tableInfo) {
      setTableData(formatTableData(tableInfo));
      setTableHeaders(tableInfo.columns.map(col => col.name));
      addStatusMessage(`切换到表: ${tableName}`);
    }
  };

  const formatTableData = (tableInfo) => {
    if (!tableInfo || !tableInfo.columns || !tableInfo.data) return [];
    
    return tableInfo.data.map(row => {
      const obj = {};
      tableInfo.columns.forEach((column, index) => {
        obj[column.name] = row[index] || '';
      });
      return obj;
    });
  };

  const handleUpload = () => {
    addStatusMessage('开始上传数据库到云端...');
    setSyncStatus('Uploading...');
    setTimeout(() => {
      setSyncStatus('Completed');
      addStatusMessage('数据库上传完成');
      setTimeout(() => setSyncStatus('Idle'), 2000);
    }, 3000);
  };

  const handleEncryptDatabase = () => {
    addStatusMessage(`开始加密表: ${selectedTable}...`);
    // 模拟加密过程
    setTimeout(() => {
      addStatusMessage(`表 ${selectedTable} 加密完成`);
    }, 2000);
  };

  if (loading) {
    return (
      <div className="data-owner-container">
        <div className="loading-spinner">正在解析数据库结构...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-owner-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="data-owner-container">
      <div className="owner-header">
        <div className="header-left">
          <h1>CryptoDB</h1>
          <span className="role-badge">数据拥有者模式</span>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          退出登录
        </button>
      </div>

      <div className="owner-content">
        <div className="data-panel">
          <div className="panel-header">
            <h2>YOUR DATA</h2>
            <div className="table-selector">
              <select 
                value={selectedTable} 
                onChange={(e) => handleTableChange(e.target.value)}
                className="table-dropdown"
              >
                {Object.keys(tables).map(tableName => (
                  <option key={tableName} value={tableName}>
                    {tableName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
         <div className="data-content">
  {/* 可滚动的表格区域 */}
  <div className="table-scroll">
    <table className="data-table">
      <thead>
        <tr>
          {tableHeaders.map(header => (
            <th key={header} className="data-header-cell">
              {header.toUpperCase()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableData.map((row, index) => (
          <tr key={index} className="data-body-row">
            {tableHeaders.map(header => (
              <td key={header} className="data-body-cell">
                {row[header] || '0'}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  {/* 固定在底部的摘要和按钮 */}
  <div className="data-footer">
    <div className="data-summary">
      <div className="summary-item">
        <label>表名:</label>
        <span>{selectedTable}</span>
      </div>
      <div className="summary-item">
        <label>记录数:</label>
        <span>{tableData.length}</span>
      </div>
      <div className="summary-item">
        <label>列数:</label>
        <span>{tableHeaders.length}</span>
      </div>
    </div>
    <button className="view-report-btn" onClick={handleEncryptDatabase}>
      ENCRYPT DATABASE
    </button>
  </div>
</div>
        </div>  

        <div className="operations-panel">
          <div className="panel-header">
            <h2>CLOUD OPERATIONS</h2>
          </div>
          <div className="operations-content">
            {/* 新增状态显示面板 */}
            <div className="status-panel">
              <div className="status-header">
                <div className="status-title">Operation Status</div>
                <button className="btn-clear-status" onClick={handleClearStatus}>
                  Clear Status
                </button>
              </div>
              <div className="status-output" ref={statusOutputRef}>
                {statusMessages.map((msg, index) => (
                  <div key={index} className="status-message">{msg}</div>
                ))}
              </div>
            </div>
            
            <button className="upload-btn" onClick={handleUpload}>
              UPLOAD DATABASE TO CLOUD
            </button>
            
            {/* 移除 SYNC SETTINGS 按钮 */}
            
            <div className="database-info">
              <h3>数据库信息</h3>
              <div className="info-item">
                <label>表数量:</label>
                <span>{Object.keys(tables).length}</span>
              </div>
              <div className="info-item">
                <label>总记录:</label>
                <span>{Object.values(tables).reduce((sum, table) => sum + table.data.length, 0)}</span>
              </div>
            </div>

            <div className="sync-status">
              <label>Sync Status:</label>
              <span className={`status-${syncStatus.toLowerCase()}`}>
                {syncStatus}
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ 
                  width: syncStatus === 'Uploading...' ? '70%' : 
                         syncStatus === 'Completed' ? '100%' : '0%' 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataOwnerPanel;