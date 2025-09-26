import React, { useState } from 'react';
import './CryptoDBPanel.css'; // 引入样式文件

function CryptoDBPanel() {
  const [query, setQuery] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [selectedTable, setSelectedTable] = useState('user_credit'); // 新增状态，用于存储选择的表名
  const [columnData, setColumnData] = useState([]); // 存储所有列的计算结果



  const handleSecureQuery = async () => {
  if (!query.trim()) {
    alert('请输入一个正整数后再提交。');
    return;
  }

   const response = await fetch('http://172.28.7.202:8080/api/secureQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, table: selectedTable }), // 将表名发送到后端
    });

  const rawData = await response.text();
  try {
    const data = JSON.parse(rawData);
    if (data.status === 'success') {
      setColumnData(data.columns || []); 
    } else {
      setColumnData([]);
    }
  } catch (e) {
    setColumnData([]);
  }
};

  const handleClearInput = () => {
    setQuery('');
    setDecryptedOutput('');
    setColumnData('');
  };

const handleDecryptResults = () => {
  if (columnData.length === 0) {
    setDecryptedOutput('No data yet, please query first'); // 可选：无数据时的提示
    return;
  }

      // 检查是否所有列的 ans0 - ans1 都为 0
  const allDiffsAreZero = columnData.every(col => {
    const diff = col.ans0 - col.ans1;
    return diff === 0;
  });

  if (allDiffsAreZero) {
    // 如果所有差值都是 0，显示 "no result" 或自定义提示
    setDecryptedOutput('No Result'); // 或者："所有列的差值均为 0"
  } else {
    // 否则，正常计算并显示每列的 name: diff
    const decryptedResults = columnData
      .map(col => {
        const diff = col.ans0 - col.ans1;
        return `${col.name}: ${diff}`;
      })
      .join('\n'); // 换行分隔

    setDecryptedOutput(decryptedResults);
  }
};

  return (
    <div className="container">
      <div className="logo-container">
        <div className="logo"></div>
        <div className="logo-text">CryptoDB</div>
      </div>

      <div className="main-content">
        <div className="query-section">
          <div className="panel">
            <div className="panel-title">Encrypted Query Input</div>
            <textarea
              id="query-input"
              className="query-input"
              placeholder="Enter your encrypted SQL query here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            ></textarea>
            <select
              id="table-select"
              className="table-select"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
            >
              <option value="user_credit">user_credit</option>
              <option value="client_credit">client_credit</option>
            </select>
            <button id="secure-query" className="btn btn-secure" onClick={handleSecureQuery}>
              Secure Query
            </button>
            <button id="clear-input" className="btn btn-clear" onClick={handleClearInput}>
              Clear Input
            </button>
          </div>

          <div className="panel">
            <div className="panel-title">Query Results S1 & S2(Encrypted)</div>
             <div className="results-container">
              
              {/* 左列：显示所有 name 的 ans0 */}
  <div className="query-results-left">
   {columnData.length === 0 ? (
      // 情况 1：没有数据时，显示一个带 placeholder 的 textarea
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
      // 情况 2：有数据时，显示每列的 ans0（通过 columnData.map 渲染）
      columnData.map((col, idx) => (
        <div key={`left-${idx}`} className="result-item">
          {col.name}: {col.ans0}
        </div>
      ))
    )}
  </div>

  {/* 右列：显示所有 name 的 ans1 */}
  <div className="query-results-right">
    {columnData.length === 0 ? (
      // 情况 1：没有数据时，显示一个带 placeholder 的 textarea
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
      // 情况 2：有数据时，显示每列的 ans0（通过 columnData.map 渲染）
      columnData.map((col, idx) => (
        <div key={`left-${idx}`} className="result-item">
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
       

            {decryptedOutput} {/* 点击 Decrypt 后显示这里 */}

          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default CryptoDBPanel;