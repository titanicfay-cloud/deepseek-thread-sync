document.getElementById('extractBtn').addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab.url.includes("://deepseek.com")) {
    alert("Please navigate to your DeepSeek chat tab first!");
    return;
  }

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractDeepSeekChatText
  }, (results) => {
    if (!results || !results) return;
    generateHtmlFile(results.result);
  });
});

function extractDeepSeekChatText() {
  const chatRows = document.querySelectorAll('.ds-markdown, [class*="chat-message"], [class*="ds-block"]');
  let messages = [];
  
  chatRows.forEach((row) => {
    let content = row.innerText || row.textContent;
    let isAssistant = row.closest('[class*="assistant"]') || row.querySelector('pre') || row.classList.contains('ds-markdown');
    let role = isAssistant ? "🤖 DEEPSEEK CORE" : "👤 USER PROMPT";
    
    if (content.trim().length > 0) {
      messages.push({ role: role, text: content.trim() });
    }
  });
  
  let pageTitle = document.title || "Archived_DeepSeek_Chat";
  return { title: pageTitle, logs: messages };
}

function generateHtmlFile(data) {
  if (!data || data.logs.length === 0) {
    alert("Could not extract chat bubbles. Make sure the thread is completely loaded on your screen.");
    return;
  }

  let htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://googleapis.com');
  
  body { 
    font-family: 'Inter', -apple-system, sans-serif; 
    color: #e2e8f0; 
    background-color: #0f172a; 
    padding: 50px; 
    max-width: 900px; 
    margin: auto; 
    line-height: 1.7; 
  }
  
  .sync-directive { 
    background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); 
    border: 1px solid #6366f1; 
    padding: 24px; 
    border-radius: 12px; 
    margin-bottom: 40px;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
  }
  
  .sync-directive h3 {
    margin-top: 0;
    color: #818cf8;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .sync-directive p {
    color: #cbd5e1;
    font-size: 14px;
    margin-bottom: 0;
  }

  h1 { 
    font-size: 26px; 
    color: #f8fafc; 
    border-bottom: 1px solid #334155; 
    padding-bottom: 12px; 
    font-weight: 700;
  }
  
  .card { 
    padding: 20px; 
    margin-bottom: 24px; 
    border-radius: 10px; 
    background: #1e293b;
    border: 1px solid #334155;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
  
  .user-card { 
    border-left: 5px solid #a855f7; 
    background: #1e1b4b;
  }
  
  .ai-card { 
    border-left: 5px solid #10b981; 
    background: #022c22;
  }
  
  .badge { 
    font-weight: 700; 
    font-size: 11px; 
    margin-bottom: 12px; 
    color: #94a3b8; 
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  
  .user-card .badge { color: #c084fc; }
  .ai-card .badge { color: #34d399; }
  
  pre { 
    background: #0f172a; 
    padding: 18px; 
    border-radius: 8px; 
    font-family: 'Fira Code', monospace; 
    font-size: 13px; 
    overflow-x: auto; 
    white-space: pre-wrap;
    border: 1px solid #1e293b;
    color: #38bdf8;
  }
  
  p { margin: 0 0 10px 0; font-size: 15px; }
  p:last-child { margin-bottom: 0; }
</style>
</head>
<body>
  <div class="sync-directive">
    <h3>🤖 ARCHIVAL COMPARISON DIRECTIVE (CONTEXT LOCK)</h3>
    <p><strong>"The document below contains the full structural transcript of our multi-day technical discussion. Read and process this log completely. Compare our past debugging attempts, intermediate logic iterations, and structural code ideas. Reconcile what was left incomplete versus what worked, update your internal context maps, and wait for my next tracking command."</strong></p>
  </div>
  <h1>📋 THREAD LOG: \${data.title}</h1>
  <div style="height: 20px;"></div>
\`;

  data.logs.forEach((msg) => {
    let cardStyle = msg.role.includes("USER") ? "user-card" : "ai-card";
    let cleanText = msg.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    if (cleanText.includes("\`\`\`")) {
      let segments = cleanText.split("\`\`\`");
      let builtText = "";
      segments.forEach((seg, idx) => {
        if (idx % 2 === 1) {
          builtText += \`<pre>\${seg.trim()}</pre>\`;
         } else {
          builtText += \`<p>\${seg.trim().replace(/\\n/g, "<br>")}</p>\`;
        }
      });
      cleanText = builtText;
    } else {
      cleanText = \`<p>\${cleanText.replace(/\\n/g, "<br>")}</p>\`;
    }

    htmlContent += \`
  <div class="card \${cardStyle}">
    <div class="badge">\${msg.role}</div>
    <div class="content-body">\${cleanText}</div>
  </div>\`;
  });

  htmlContent += \`</body></html>\`;

  let blob = new Blob([htmlContent], { type: 'text/html' });
  let url = URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = \`\${data.title.replace(/[^a-z0-9]/gi, '_')}_sync.html\`;
  a.click();
}
