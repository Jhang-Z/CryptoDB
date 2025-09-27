import React, {  useState, useEffect, useRef } from 'react';
import './CryptoDBPanel.css'; // 引入样式文件

function CryptoDBPanel({ onLogout }) {
  const [query, setQuery] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [selectedTable, setSelectedTable] = useState('user_stats');
  const [statusMessages, setStatusMessages] = useState([]); // 新增状态，用于存储状态消息
  const [selectedQueryMode, setSelectedQueryMode] = useState('exact'); // 默认是等值查询
  const [rowData0, setRowData0] = useState({}); // {columnName: [{ans0: value, rowId: id}, ...]}
  const [rowData1, setRowData1] = useState({});
  const [tableColumns, setTableColumns] = useState([]); // 存储当前选中表的列属性
const [selectedColumn, setSelectedColumn] = useState(''); // 当前选中的列


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
  addStatusMessage('正在从 Server1 (8081) 获取行级结果...');
  
  try {
    const res = await fetch('http://172.28.7.202:8081/server0', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const rawData = await res.text();
    const data = JSON.parse(rawData);
    
    console.log('server0 Data:', data.columns);
    
    if (data && data.columns) {
      const formattedData = {};
      
      data.columns.forEach(col => {
        // 假设每列的 ans0 值是一个数组，每个元素代表一行
        // 如果后端返回的是单个值，需要调整为数组形式
        const ans0Values = Array.isArray(col.ans0_values) ? col.ans0_values : [col.ans0];
        formattedData[col.name] = ans0Values.map((value, index) => ({
          ans0: value,
        }));
      });
      console.log('server0 formattedData:',formattedData);
      setRowData0(formattedData);
      addStatusMessage(`成功从 Server1 获取 ${Object.keys(formattedData).length} 列的行数据`);
    }
  } catch (e) {
    addStatusMessage(`获取 Server1 行数据失败: ${e.message}`);
    console.error('Fetch from Server1 error:', e);
  }
};

  // ===== 新增：从 Server2 (8082) 单独获取 ans1 =====
  const handleFetchAns1FromServer2 = async () => {
  addStatusMessage('正在从 Server2 (8082) 获取行级结果...');
  
  try {
    const res = await fetch('http://172.28.7.202:8082/server1', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const rawData = await res.text();
    const data = JSON.parse(rawData);
    
    console.log('server1 Data:', data);
    if (data && data.columns) {
      const formattedData = {};
      
      data.columns.forEach(col => {
        // 假设每列的 ans1 值是一个数组，每个元素代表一行
        // 如果后端返回的是单个值，需要调整为数组形式
        const ans1Values = Array.isArray(col.ans1_values) ? col.ans1_values : [col.ans1];
       
        formattedData[col.name] = ans1Values.map((value, index) => ({
          ans1: value,
        }));
      });
      console.log('server1 formattedData:', formattedData);
      setRowData1(formattedData);
      addStatusMessage(`成功从 Server2 获取 ${Object.keys(formattedData).length} 列的行数据`);
    }
  } catch (e) {
    addStatusMessage(`获取 Server2 行数据失败: ${e.message}`);
    console.error('Fetch from Server2 error:', e);
  }
};

  const handleClearInput = () => {
    setQuery('');
    setDecryptedOutput('');
    addStatusMessage('已清除所有输入和结果');
    setRowData0({});
    setRowData1({});
  };

const handleDecryptResults = () => {
  addStatusMessage('正在解密结果...');

  if (Object.keys(rowData0).length === 0 || Object.keys(rowData1).length === 0) {
    setDecryptedOutput('No data yet, please query Server1 and Server2 first');
    addStatusMessage('解密失败：缺少 Server1 或 Server2 数据');
    return;
  }

  // 最终结果对象，结构与 rowData0 一致，如 { ID: ['差值', ...], is_active: [...] }
  const decryptedOutput = {};
  let filteredRowCount = 0; // 记录被过滤的全零行数量

  // 遍历每一个字段，如 ID、is_active、order_amount
  Object.keys(rowData0).forEach((key) => {
    const arr0 = rowData0[key]; // 比如 [{ans0: '3665825759'}, {ans0: '789741340'}, ...]
    const arr1 = rowData1[key] || []; // 避免 key 不存在于 rowData1

    // 构建差值字符串数组
    const diffArray = arr0.map((item0, i) => {
      const item1 = arr1[i]; // 可能为 undefined

      // 取 ans0 和 ans1 字符串
      const ans0Str = item0?.ans0;
      const ans1Str = item1?.ans1;

      const num0 = Number(ans0Str);
      const num1 = Number(ans1Str);

      // 检查是否是合法数字
      if (isNaN(num0) || isNaN(num1)) {
        return 'N/A';
      }

      // 计算差值
      return num0 - num1;
    });

    // 存入结果
    decryptedOutput[key] = diffArray;
  });

  // 过滤全零行
  const filteredOutput = {};
  const rowCount = Math.max(...Object.values(decryptedOutput).map(arr => arr.length));
  
  // 遍历每一行
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    let isAllZero = true;
    
    // 检查当前行是否全为零
    for (const key in decryptedOutput) {
      const value = decryptedOutput[key][rowIndex];
      if (value !== 0 && value !== '0' && value !== 'N/A') {
        isAllZero = false;
        break;
      }
    }
    
    // 如果不是全零行，则保留该行数据
    if (!isAllZero) {
      for (const key in decryptedOutput) {
        if (!filteredOutput[key]) {
          filteredOutput[key] = [];
        }
        filteredOutput[key].push(decryptedOutput[key][rowIndex]);
      }
    } else {
      filteredRowCount++;
    }
  }

  if (filteredRowCount > 0) {
    addStatusMessage(`过滤了 ${filteredRowCount} 行全零数据`);
  }

  console.log('🔍 解密结果（差值，字符串数字数组）:', filteredOutput);

  // 设置到 state，用于后续展示或导出
  setDecryptedOutput(filteredOutput);

  addStatusMessage('解密完成：已生成各列的差值（字符串数字数组）');
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

      
  {/* Server1 表格 */}
           
               <div className="results1-container">
              <div className="result1-item">
                IP地址:172.28.7.202 端口号:8081
              </div>
              <button
                className="btn-small"
                onClick={handleFetchAns0FromServer1}
              >
                <div className="result2-item">
                  Get result from S1
                </div>
              </button>
            </div>
              
  {/* Server1 表格 */}
  <div className="query-results-left">

              
    {Object.keys(rowData0).length === 0 ? (
      <div className="result-item">No data from Server1</div>
    ) : (
     <div className="table-scroll1">
    <table className="data-table1">
         <thead>
    <tr>
      {Object.keys(rowData0).map(colName => (
        <th key={`s1-header-${colName}`} className="data-header1">
          {colName}
        </th>
      ))}
    </tr>
  </thead>
          <tbody>
            {(() => {
              // 获取最大行数
              const maxRows = Math.max(
                ...Object.values(rowData0).map(col => col.length)
              );
              
              // 生成行数据
              const rows = [];
              for (let i = 0; i < maxRows; i++) {
                rows.push(
                  <tr key={`s1-row-${i}` } className="data-body-row1">
               
                    {Object.keys(rowData0).map(colName => (
                      <td key={`s1-cell-${colName}-${i}`} className="data-body-cell1">
                        {rowData0[colName][i]?.ans0 || '-'}
                      </td>
                    ))}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>
    )}
  </div>

 
               <div className="results1-container">
              <div className="result1-item">
                IP地址:172.28.7.202 端口号:8082
              </div>
              <button
                className="btn-small"
                onClick={handleFetchAns1FromServer2}
              >
                <div className="result2-item">
                  Get result from S2
                </div>
              </button>
            </div>
              
  {/* Server2 表格 */}
  <div className="query-results-right">
    {Object.keys(rowData1).length === 0 ? (
      <div className="result-item">No data from Server2</div>
    ) : (
      <div className="table-scroll1">
    <table className="data-table1">
          <thead>
    <tr>
      {Object.keys(rowData0).map(colName => (
        <th key={`s1-header-${colName}`} className="data-header1">
          {colName}
        </th>
      ))}
    </tr>
  </thead>
          <tbody>
            {(() => {
              // 获取最大行数
              const maxRows = Math.max(
                ...Object.values(rowData1).map(col => col.length)
              );
              
              // 生成行数据
              const rows = [];
              for (let i = 0; i < maxRows; i++) {
                rows.push(
                  <tr key={`s2-row-${i}`} className="data-body-row1">
                  
                    {Object.keys(rowData1).map(colName => (
                      <td key={`s2-cell-${colName}-${i}`} className="data-body-cell1">
                        {rowData1[colName][i]?.ans1 || '-'}
                      </td>
                    ))}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>
    )}
  </div>

  
            <button id="decrypt-results" className="btn btn-decrypt" onClick={handleDecryptResults}>
              Decrypt Results
            </button>
            
            <div className="query-results">
               {Object.keys(decryptedOutput).length === 0 ? (
      <div className="result-item">Waiting for decrypted</div>
    ) : (
     <div className="table-scroll1">
    <table className="data-table1">
         <thead>
    <tr>
      {Object.keys(decryptedOutput).map(colName => (
        <th key={`s1-header-${colName}`} className="data-header1">
          {colName}
        </th>
      ))}
    </tr>
  </thead>
          <tbody>
            {(() => {
              // 获取最大行数
              const maxRows = Math.max(
                ...Object.values(decryptedOutput).map(col => col.length)
              );
              
              // 生成行数据
              const rows = [];
              for (let i = 0; i < maxRows; i++) {
                rows.push(
                  <tr key={`s1-row-${i}` } className="data-body-row1">
               
                    {Object.keys(decryptedOutput).map(colName => (
                      <td key={`s1-cell-${colName}-${i}`} className="data-body-cell1">
                        {decryptedOutput[colName][i]}
                      </td>
                    ))}
                  </tr>
                );
              }
              return rows;
            })()}
          </tbody>
        </table>
      </div>
    )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CryptoDBPanel;