import React, {  useState, useEffect, useRef } from 'react';
import './CryptoDBPanel.css'; // 引入样式文件

function CryptoDBPanel({ onLogout }) {
  const [query, setQuery] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [selectedTable, setSelectedTable] = useState('user_stats');
  const [columnData0, setColumnData0] = useState([]);
  const [columnData1, setColumnData1] = useState([]);
  const [statusMessages, setStatusMessages] = useState([]); // 新增状态，用于存储状态消息
  const [selectedQueryMode, setSelectedQueryMode] = useState('exact'); // 默认是等值查询


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

  const handleSecureQuery = async () => {
    if (!query.trim()) {
      alert('请输入一个正整数后再提交。');
      return;
    }

    addStatusMessage('正在提交安全查询...');
    
    try {
      const response = await fetch('http://172.28.7.202:8080/api/secureQuery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, table: selectedTable }),
      });

      const rawData = await response.text();
      const data = JSON.parse(rawData);
      console.log('main:', data);
      
      addStatusMessage('查询已成功提交到服务器');
      addStatusMessage('请从服务器获取结果');
    } catch (error) {
      addStatusMessage(`查询失败: ${error.message}`);
    }
  };

  // ===== 新增：从 Server1 (8081) 单独获取 ans0 =====
  const handleFetchAns0FromServer1 = async () => {
    addStatusMessage('正在从 Server1 (8081) 获取结果...');
    
    try {
      const res = await fetch('http://172.28.7.202:8081/server0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const rawData = await res.text();
      const data = JSON.parse(rawData);
      
      if (data && data.columns && Array.isArray(data.columns)) {
        setColumnData0(data.columns);
        addStatusMessage(`成功从 Server1 获取 ${data.columns.length} 列数据`);
      } else {
        console.warn('⚠️ Server1 返回的 data 或 data.columns 无效:', Array.isArray(data.columns));
        setColumnData0([]);
        addStatusMessage('Server1 返回的数据格式无效');
      }
    } catch (e) {
      console.error('获取 Server1 (ans0) 失败:', e);
      addStatusMessage(`获取 Server1 结果失败: ${e.message}`);
    }
  };

  // ===== 新增：从 Server2 (8082) 单独获取 ans1 =====
  const handleFetchAns1FromServer2 = async () => {
    addStatusMessage('正在从 Server2 (8082) 获取结果...');
    
    try {
      const res = await fetch('http://172.28.7.202:8082/server1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const rawData = await res.text();
      const data = JSON.parse(rawData);
      
      if (data && data.columns && Array.isArray(data.columns)) {
        setColumnData1(data.columns);
        addStatusMessage(`成功从 Server2 获取 ${data.columns.length} 列数据`);
      } else {
        console.warn('⚠️ Server2 返回的 data 或 data.columns 无效:', data.columns);
        setColumnData1([]);
        addStatusMessage('Server2 返回的数据格式无效');
      }
    } catch (e) {
      console.error('获取 Server2 (ans1) 失败:', e);
      addStatusMessage(`获取 Server2 结果失败: ${e.message}`);
    }
  };

  const handleClearInput = () => {
    setQuery('');
    setDecryptedOutput('');
    setColumnData0([]);
    setColumnData1([]);
    addStatusMessage('已清除所有输入和结果');
  };

  const handleDecryptResults = () => {
    addStatusMessage('正在解密结果...');
    
    if (columnData0.length === 0 || columnData1.length === 0) {
      setDecryptedOutput('No data yet, please query first');
      addStatusMessage('解密失败：缺少服务器数据');
      return;
    }

   
  // 构造一个以 name 为 key 的 Map，便于查找
  const ans0Map = new Map();
  for (const col of columnData0) {
    ans0Map.set(col.name, col.ans0);
  }

  const ans1Map = new Map();
  for (const col of columnData1) {
    ans1Map.set(col.name, col.ans1);
  }

  const decryptedResults = [];
  let allZeros = true;

  // 遍历其中一个 Map，比如 ans0Map
  for (const [name, ans0Str] of ans0Map) {
    const ans1Str = ans1Map.get(name);

    if (ans1Str === undefined) {
      decryptedResults.push(`${name}: Server2 无对应数据`);
      allZeros = false; // 有不匹配的数据，不能显示"No Result"
      continue;
    }

    const diff = ans0Str - ans1Str;
    
    // 即使差值为0也添加到结果中
    decryptedResults.push(`${name}: ${diff}`);
    
    // 只有当所有差值都为0时才设置allZeros为true
    if (diff !== 0) {
      allZeros = false;
    }
  }

  // 检查是否有 Server1 有但 Server2 没有的列（可选）
  for (const [name] of ans1Map) {
    if (!ans0Map.has(name)) {
      decryptedResults.push(`${name}: Server1 无对应数据`);
      allZeros = false; // 有不匹配的数据，不能显示"No Result"
    }
  }

  if (allZeros) {
    setDecryptedOutput('No Result');
    addStatusMessage('解密完成：所有列的差值均为0');
  } else {
    setDecryptedOutput(decryptedResults.join('\n'));
    addStatusMessage('解密完成：显示结果');
  }
};

  return (
    <div className="container">
      
      <div className="logo-container">
        <div className="logo"></div>
        <div className="logo-text">CryptoDB</div>
         <button className="logout-btn" onClick={onLogout}>
          退出登录
        </button>
         
      </div>
     
    <span className="role-badge">查询者模式</span>
      <div className="main-content">
        
        <div className="query-section">
          <div className="panel">
            <div className="panel-title">检索模式</div>
            
            {/* 🔧 新增：查询模式 label + 下拉菜单 */}
            
            <select
              id="query-mode-select"
              className="table-select query-mode-select"  // 复用或新增样式
              value={selectedQueryMode}
              onChange={(e) => setSelectedQueryMode(e.target.value)}
            >
              <option value="exact">等值查询</option>
              <option value="range">范围查询</option>
              <option value="prefix">前缀查询</option>
            </select> 
            <textarea
              id="query-input"
              className="query-input"
              placeholder="Enter your encrypted SQL query here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            ></textarea>
            <label htmlFor="query-mode-select" className="query-mode-label">选择表</label>
            <select
              id="table-select"
              className="table-select"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              
              <option value="user_stats">user_stats</option>
              <option value="user_credit">user_credit</option>             
            </select>          
             
            <button id="secure-query" className="btn btn-secure" onClick={handleSecureQuery}>
              Secure Query
            </button>
            <button id="clear-input" className="btn btn-clear" onClick={handleClearInput}>
              Clear Input
            </button>
            
            {/* 新增：状态显示框 */}
            <div className="status-panel">
              <div className="status-header">
                <div className="status-title">Query Status</div>
                <button className="btn btn-clear-status" onClick={handleClearStatus}>
                  Clear Status
                </button>
              </div>
              <div className="status-output" ref={statusOutputRef}>
                {statusMessages.map((msg, index) => (
                  <div key={index} className="status-message">{msg}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Query Results S1 & S2(Encrypted)</div>

            <div className="results-container">
              <button
                className="btn btn-small"
                onClick={handleFetchAns0FromServer1}
              >
                <div className="result2-item">
                  Get result from Server1
                </div>
              </button>

              <button
                className="btn btn-small"
                onClick={handleFetchAns1FromServer2}
              >
                <div className="result2-item">
                  Get result from Server2
                </div>
              </button>
            </div>
            
            <div className="results1-container">
              <div className="result1-item">
                IP地址:172.28.7.202 端口号:8081
              </div>
              <div className="result1-item">
                IP地址:172.28.7.202 端口号::8082
              </div>
            </div>

            <div className="results-container">
              <div className="query-results-left">
                {columnData0.length === 0 ? (
                  <textarea
                    placeholder="The Output of the Server S1"
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: '#ffffff',
                      font: 'Courier New',
                      border: 'none',
                      fontSize: '13px',
                      width: '100%',
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                ) : (
                  columnData0.map((col, idx) => (
                    <div key={`left-${idx}`} className="result-item">
                      {col.name}: {col.ans0}
                    </div>
                  ))
                )}
              </div>

              <div className="query-results-right">
                {columnData1.length === 0 ? (
                  <textarea
                    placeholder="The Output of the Server S2"
                    style={{
                      backgroundColor: '#1a1a2e',
                      color: '#ffffff',
                      font: 'Courier New',
                      border: 'none',
                      fontSize: '13px',
                      width: '100%',
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                ) : (
                  columnData1.map((col, idx) => (
                    <div key={`right-${idx}`} className="result-item">
                      {col.name}: {col.ans1}
                    </div>
                  ))
                )}
              </div>
            </div>
  
            <button id="decrypt-results" className="btn btn-decrypt" onClick={handleDecryptResults}>
              Decrypt Results
            </button>
            
            <div className="query-results">
              {decryptedOutput}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CryptoDBPanel;