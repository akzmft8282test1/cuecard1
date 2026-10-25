const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase 클라이언트 설정
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("⚠️ SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 공통 HTML 템플릿 헬퍼
function sendHtml(res, title, bodyContent) {
  const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --bg-color: #f8fafc;
      --card-bg: #ffffff;
      --text-main: #1e293b;
      --text-muted: #64748b;
      --highlight: #2563eb;
      --border-color: #e2e8f0;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-main);
      padding: 20px 10px;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: var(--card-bg);
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid var(--border-color);
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    nav h1 { font-size: 1.4rem; color: var(--text-main); }
    nav div { display: flex; gap: 10px; }

    .nav-btn {
      text-decoration: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .nav-btn.primary { background: var(--primary); color: white; }
    .nav-btn.primary:hover { background: var(--primary-hover); }
    .nav-btn.secondary { background: #e2e8f0; color: #334155; }
    .nav-btn.secondary:hover { background: #cbd5e1; }

    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; font-weight: 600; margin-bottom: 6px; font-size: 0.95rem; }
    .form-group input, .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      font-size: 1rem;
    }

    .btn {
      width: 100%;
      padding: 12px;
      background: var(--primary);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: bold;
      cursor: pointer;
    }
    .btn:hover { background: var(--primary-hover); }

    .card-item {
      background: #f1f5f9;
      border-left: 5px solid var(--primary);
      padding: 14px;
      border-radius: 6px;
      margin-bottom: 10px;
      font-size: 1.05rem;
    }

    .hl { color: var(--highlight); font-weight: bold; text-decoration: underline; }
    .blank-box {
      background: #334155;
      color: transparent;
      border-radius: 4px;
      padding: 2px 8px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s;
    }
    .blank-box.revealed { background: transparent; color: var(--highlight); text-decoration: underline; font-weight: bold; }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 20px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
    }

    .flashcard {
      min-height: 200px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border: 2px solid var(--primary);
      border-radius: 12px;
      padding: 20px;
      background: #fff;
      font-size: 1.25rem;
      cursor: pointer;
      margin-bottom: 15px;
    }
    .flashcard-num { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 10px; }

    .btn-sm { padding: 6px 12px; font-size: 0.85rem; border-radius: 4px; border: none; cursor: pointer; }
    .btn-del { background: #ef4444; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <nav>
      <h1>🌐 공용 큐카드 발표 연습기</h1>
      <div>
        <a href="/" class="nav-btn secondary">연습하기 ( / )</a>
        <a href="/add" class="nav-btn primary">큐카드 추가 ( /add )</a>
      </div>
    </nav>
    ${bodyContent}
  </div>
</body>
</html>
  `;
  res.send(fullHtml);
}

// -------------------------------------------------------------
// [API] Supabase에서 카드 삭제
// -------------------------------------------------------------
app.post('/api/delete', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Missing ID' });

  const { error } = await supabase.from('cuecards').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });

  res.json({ success: true });
});

// -------------------------------------------------------------
// [메인 페이지 / ] - DB 공유 큐카드 불러오기 및 연습
// -------------------------------------------------------------
app.get('/', async (req, res) => {
  // DB에서 큐카드 전체 목록 불러오기
  const { data: cards, error } = await supabase
    .from('cuecards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase Error:', error);
  }

  const safeCards = cards || [];

  const body = `
    <div style="margin-bottom: 20px;">
      <div class="form-group">
        <label for="speakerInput">👤 발표자 이름 [이름]:</label>
        <input type="text" id="speakerInput" value="Minsoo" onchange="localStorage.setItem('speakerName', this.value); render();">
      </div>

      <div class="form-group">
        <label for="cardSelect">📚 연습할 공용 큐카드 선택 (Supabase 동기화):</label>
        <div style="display: flex; gap: 10px;">
          <select id="cardSelect" onchange="loadSelectedCard()" style="flex: 1;"></select>
          <button onclick="deleteCard()" class="btn-sm btn-del">삭제</button>
        </div>
      </div>
    </div>

    <div class="toolbar">
      <button onclick="setMode('list')" class="nav-btn primary">전체 대본 모드</button>
      <button onclick="setMode('slide')" class="nav-btn secondary">슬라이드 모드</button>
      <button onclick="setMode('blank')" class="nav-btn secondary">빈칸 암기 모드</button>
      <button onclick="speakAll()" class="nav-btn secondary" style="background:#10b981; color:white;">🔊 전체 오디오 듣기</button>
    </div>

    <div id="contentArea"></div>

    <script>
      const cards = ${JSON.stringify(safeCards)};
      let activeCard = cards.length > 0 ? cards[0] : null;
      let currentMode = 'list';
      let currentCardIndex = 0;

      document.addEventListener('DOMContentLoaded', () => {
        const savedName = localStorage.getItem('speakerName');
        if (savedName) {
          document.getElementById('speakerInput').value = savedName;
        }

        const select = document.getElementById('cardSelect');
        select.innerHTML = '';

        if(cards.length === 0) {
          select.innerHTML = '<option value="">(DB에 등록된 큐카드가 없습니다)</option>';
        } else {
          cards.forEach((card, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = card.title;
            select.appendChild(opt);
          });
        }

        render();
      });

      function loadSelectedCard() {
        const idx = document.getElementById('cardSelect').value;
        activeCard = cards[idx];
        currentCardIndex = 0;
        render();
      }

      async function deleteCard() {
        if (!activeCard) return;
        if (confirm(\`"\${activeCard.title}" 큐카드를 DB에서 완전히 삭제하시겠습니까?\`)) {
          const res = await fetch('/api/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: activeCard.id })
          });
          if (res.ok) {
            alert('삭제되었습니다.');
            window.location.reload();
          } else {
            alert('삭제 실패');
          }
        }
      }

      function setMode(mode) {
        currentMode = mode;
        render();
      }

      function getLines(card, name) {
        if (!card) return [];
        return [
          { num: "1", en: \`Hello, my name is <span class="hl">\${name}</span>.\`, text: \`Hello, my name is \${name}.\` },
          { num: "2", en: \`Today, I want to introduce a great invention, <span class="hl">\${card.v1}</span>.\`, text: \`Today, I want to introduce a great invention, \${card.v1}.\` },
          { num: "3", en: \`It was invented by <span class="hl">\${card.v2}</span> in America.\`, text: \`It was invented by \${card.v2} in America.\` },
          { num: "4", en: \`Long ago, it was made in <span class="hl">\${card.v4}</span>.\`, text: \`Long ago, it was made in \${card.v4}.\` },
          { num: "5", en: \`Before this invention, people had a big problem.\`, text: \`Before this invention, people had a big problem.\` },
          { num: "6", en: \`They had to <span class="hl">\${card.v5}</span>.\`, text: \`They had to \${card.v5}.\` },
          { num: "7", en: \`It was very uncomfortable.\`, text: \`It was very uncomfortable.\` },
          { num: "8", en: \`But now, thanks to this invention, our lives are different.\`, text: \`But now, thanks to this invention, our lives are different.\` },
          { num: "9", en: \`We don't have to <span class="hl">\${card.v6}</span> anymore.\`, text: \`We don't have to \${card.v6} anymore.\` },
          { num: "10", en: \`Today, people usually use it to <span class="hl">\${card.v7}</span>.\`, text: \`Today, people usually use it to \${card.v7}.\` },
          { num: "11", en: \`This invention makes our lives so convenient.\`, text: \`This invention makes our lives so convenient.\` },
          { num: "11-1", en: \`It saves us so much time and energy every day.\`, text: \`It saves us so much time and energy every day.\` },
          { num: "12", en: \`Thank you for listening to my speech.\`, text: \`Thank you for listening to my speech.\` }
        ];
      }

      function speakText(text) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      }

      function speakAll() {
        if (!activeCard) return;
        const name = document.getElementById('speakerInput').value || 'Minsoo';
        const lines = getLines(activeCard, name);
        speakText(lines.map(l => l.text).join(' '));
      }

      function render() {
        const area = document.getElementById('contentArea');
        if (!activeCard) {
          area.innerHTML = '<p style="text-align:center; padding:30px;">등록된 큐카드가 없습니다. [큐카드 추가] 버튼을 눌러 생성해주세요.</p>';
          return;
        }

        const name = document.getElementById('speakerInput').value || 'Minsoo';
        const lines = getLines(activeCard, name);

        if (currentMode === 'list') {
          area.innerHTML = lines.map(l => \`
            <div class="card-item">
              <strong>\${l.num})</strong> \${l.en}
              <button onclick="speakText('\${l.text.replace(/'/g, "\\\\'")}')" style="margin-left:8px; cursor:pointer;">🔊</button>
            </div>
          \`).join('');
        } 
        else if (currentMode === 'slide') {
          const l = lines[currentCardIndex];
          area.innerHTML = \`
            <div class="flashcard" onclick="speakText('\${l.text.replace(/'/g, "\\\\'")}')">
              <div class="flashcard-num">Card \${currentCardIndex + 1} / \${lines.length} (\${l.num}번 문장)</div>
              <div>\${l.en}</div>
              <div style="font-size:0.8rem; color:#94a3b8; margin-top:15px;">(클릭시 발음 듣기)</div>
            </div>
            <div style="display:flex; justify-content:space-between;">
              <button onclick="prevSlide()" class="nav-btn secondary" \${currentCardIndex === 0 ? 'disabled' : ''}>이전</button>
              <button onclick="nextSlide()" class="nav-btn primary" \${currentCardIndex === lines.length - 1 ? 'disabled' : ''}>다음</button>
            </div>
          \`;
        }
        else if (currentMode === 'blank') {
          area.innerHTML = lines.map(l => {
            let html = l.en
              .replace(name, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${name}</span>\`)
              .replace(activeCard.v1, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v1}</span>\`)
              .replace(activeCard.v2, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v2}</span>\`)
              .replace(activeCard.v4, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v4}</span>\`)
              .replace(activeCard.v5, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v5}</span>\`)
              .replace(activeCard.v6, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v6}</span>\`)
              .replace(activeCard.v7, \`<span class="blank-box" onclick="this.classList.toggle('revealed')">\${activeCard.v7}</span>\`);

            return \`
              <div class="card-item">
                <strong>\${l.num})</strong> \${html}
              </div>
            \`;
          }).join('');
        }
      }

      function nextSlide() { currentCardIndex++; render(); }
      function prevSlide() { currentCardIndex--; render(); }
    </script>
  `;
  sendHtml(res, '큐카드 연습', body);
});

// -------------------------------------------------------------
// [추가 페이지 /add ] - Supabase DB로 신규 큐카드 저장
// -------------------------------------------------------------
app.get('/add', (req, res) => {
  const body = `
    <h2>➕ 새 공용 큐카드 추가 (Supabase 저장)</h2>
    <p style="color: var(--text-muted); margin-bottom: 20px;">등록된 큐카드는 모든 사용자가 함께 볼 수 있도록 DB에 공유됩니다.</p>

    <form method="POST" action="/add">
      <div class="form-group">
        <label>📌 큐카드 구분 이름:</label>
        <input type="text" name="title" placeholder="예: 세탁기 발표" required>
      </div>

      <div class="form-group">
        <label>1) 발명품 이름 [1]:</label>
        <input type="text" name="v1" placeholder="예: the washing machine" required>
      </div>

      <div class="form-group">
        <label>2) 발명가 [2]:</label>
        <input type="text" name="v2" placeholder="예: Alva Fisher" required>
      </div>

      <div class="form-group">
        <label>4) 연도/시기 [4]:</label>
        <input type="text" name="v4" placeholder="예: 1908" required>
      </div>

      <div class="form-group">
        <label>5) 과거의 문제점 (They had to ___) [5]:</label>
        <input type="text" name="v5" placeholder="예: wash all clothes by hand" required>
      </div>

      <div class="form-group">
        <label>6) 안 해도 되는 힘든 일 (We don't have to ___) [6]:</label>
        <input type="text" name="v6" placeholder="예: do hard laundry work" required>
      </div>

      <div class="form-group">
        <label>7) 현재 주요 사용 목적 (usually use it to ___) [7]:</label>
        <input type="text" name="v7" placeholder="예: wash a lot of clothes quickly" required>
      </div>

      <button type="submit" class="btn">DB에 저장하고 공유하기</button>
    </form>
  `;
  sendHtml(res, '큐카드 추가', body);
});

// POST 요청 처리
app.post('/add', async (req, res) => {
  const { title, v1, v2, v4, v5, v6, v7 } = req.body;

  const { error } = await supabase
    .from('cuecards')
    .insert([{ title, v1, v2, v4, v5, v6, v7 }]);

  if (error) {
    console.error('Insert error:', error);
    return res.status(500).send('DB 저장에 실패했습니다: ' + error.message);
  }

  res.redirect('/');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
