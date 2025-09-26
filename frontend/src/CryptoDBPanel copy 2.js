import React, { useState } from 'react';
import './CryptoDBPanel.css'; // 引入样式文件

function CryptoDBPanel() {
  const [query, setQuery] = useState('');
  const [decryptedOutput, setDecryptedOutput] = useState('');
  const [selectedTable, setSelectedTable] = useState('user_credit'); // 新增状态，用于存储选择的表名
  const [columnData0, setColumnData0] = useState([]); // 存储所有列的计算结果
  const [columnData1, setColumnData1] = useState([]); // 存储所有列的计算结果


  const handleSecureQuery = async () => {
  if (!query.trim()) {
    alert('请输入一个正整数后再提交。');
    return;
  }

    const response = await fetch('http://172.28.7.202:8080/api/secureQuery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, table: selectedTable}), // 将表名发送到后端
    });

    const rawData = await response.text();
    const data = JSON.parse(rawData);
    console.log('mian:', data);



};

// ===== 新增：从 Server1 (8081) 单独获取 ans0 =====
  const handleFetchAns0FromServer1 = async () => {
    try {
      const res = await fetch('http://172.28.7.202:8081/server0', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({  }),
      });

    

      const rawData = await res.text();
      const data = JSON.parse(rawData);
      console.log('📦 原始响应数据:', data);

      if (data && data.columns && Array.isArray(data.columns)) {
      setColumnData0(data.columns); // ✅ 正常设置
    } else {
      console.warn('⚠️ Server1 返回的 data 或 data.columns 无效:', Array.isArray(data.columns));
      setColumnData0([]); // ✅ 出错时设为空数组，避免后续 .length 或 .map() 崩溃
    }
  
    } catch (e) {
      console.error('获取 Server1 (ans0) 失败:', e);

    }
  };

  // ===== 新增：从 Server2 (8082) 单独获取 ans1 =====
  const handleFetchAns1FromServer2 = async () => {
    try {
      const res = await fetch('http://172.28.7.202:8082/server1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ }),
      });

      const rawData = await res.text();
      const data = JSON.parse(rawData);
      console.log('📦 原始响应数据:', rawData);

      if (data && data.columns && Array.isArray(data.columns)) {
      setColumnData1(data.columns); // ✅ 正常设置
    } else {
      console.warn('⚠️ Server1 返回的 data 或 data.columns 无效:', data.columns);
      setColumnData1([]); // ✅ 出错时设为空数组，避免后续 .length 或 .map() 崩溃
    }
     
    } catch (e) {
      console.error('获取 Server2 (ans1) 失败:', e);
     
    }
  };


  const handleClearInput = () => {
    setQuery('');
    setDecryptedOutput('');
    setColumnData0([]);
    setColumnData1([]);
  };

const handleDecryptResults = () => {
  if (columnData0.length === 0) {
    setDecryptedOutput('No data yet, please query first'); // 可选：无数据时的提示
    return;
  }


  // 构造一个以 name 为 key 的 Map，便于查找
  const ans0Map = new Map();
  for (const col of columnData0) {
    ans0Map.set(col.name, col.ans0); // { name: 'ID', ans0: '544996750763' }
  }

  const ans1Map = new Map();
  for (const col of columnData1) {
    ans1Map.set(col.name, col.ans1); // { name: 'ID', ans1: '544996750763' }
  }

  const decryptedResults = [];
  let allZeros = true;

  // 遍历其中一个 Map，比如 ans0Map
  for (const [name, ans0Str] of ans0Map) {
    const ans1Str = ans1Map.get(name);

    if (ans1Str === undefined) {
      // 如果 Server2 没有返回这个 name，可以选择跳过或提示
      decryptedResults.push(`${name}: Server2 无对应数据`);
      allZeros = false;
      continue;
    }



    const diff = ans0Str - ans1Str;

    if (diff !== 0) {
      allZeros = false;
      decryptedResults.push(`${name}: ${diff}`);
    }
    // 如果 diff === 0，什么都不做，不加入结果
  }

  // 检查是否有 Server1 有但 Server2 没有的列（可选）
  for (const [name] of ans1Map) {
    if (!ans0Map.has(name)) {
      decryptedResults.push(`${name}: Server1 无对应数据`);
      allZeros = false;
    }
  }

  if (allZeros) {
    setDecryptedOutput('No Result'); // 所有列的 ans0 - ans1 均为 0
  } else {
    setDecryptedOutput(decryptedResults.join('\n')); // 换行分隔每列结果
  }





  //     // 检查是否所有列的 ans0 - ans1 都为 0
  // const allDiffsAreZero = columnData.every(col => {
  //   const diff = col.ans0 - col.ans1;
  //   return diff === 0;
  // });
  

  // if (allDiffsAreZero) {
  //   // 如果所有差值都是 0，显示 "no result" 或自定义提示
  //   setDecryptedOutput('No Result'); // 或者："所有列的差值均为 0"
  // } else {
  //   // 否则，正常计算并显示每列的 name: diff
  //   const decryptedResults = columnData
  //     .map(col => {
  //       const diff = col.ans0 - col.ans1;
  //       return `${col.name}: ${diff}`;
  //     })
  //     .join('\n'); // 换行分隔

  //   setDecryptedOutput(decryptedResults);
  // }
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
              <option value="user_credit">user_credit</option>
              <option value="client_credit">client_credit</option>
              <option value="user_credit">user_credit</option>
              <option value="client_credit">client_credit</option>
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
              
           {/* ========== 左侧：Server1 ans0 ========= */}
           
              <div className="query-results-left">
                {/* 🔘 新增按钮：获取 Server1 (8081) 的 ans0 */}
               

                {/* 显示 ans0 数据 */}
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

              {/* ========== 右侧：Server2 ans1 ========= */}
              <div className="query-results-right">
                {/* 🔘 新增按钮：获取 Server2 (8082) 的 ans1 */}
               

                {/* 显示 ans1 数据 */}
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
       

            {decryptedOutput} {/* 点击 Decrypt 后显示这里 */}

          </div>
        </div>
      </div>
    </div>
    </div>
  );
}

export default CryptoDBPanel;