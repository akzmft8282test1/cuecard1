require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("⚠️ SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일(HTML, CSS, JS) 제공
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// [페이지 라우팅]
// -------------------------------------------------------------
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

// -------------------------------------------------------------
// [API 라우트]
// -------------------------------------------------------------

// 1. 전체 큐카드 목록 조회 API
app.get('/api/cuecards', async (req, res) => {
  const { data: cards, error } = await supabase
    .from('cuecards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(cards || []);
});

// 2. 신규 큐카드 추가 API
app.post('/api/cuecards', async (req, res) => {
  const { title, v1, v2, v4, v5, v6, v7 } = req.body;

  const { data, error } = await supabase
    .from('cuecards')
    .insert([{ title, v1, v2, v4, v5, v6, v7 }])
    .select();

  if (error) {
    console.error('Insert Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ success: true, card: data[0] });
});

// 3. 큐카드 삭제 API
app.delete('/api/cuecards/:id', async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('cuecards')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Delete Error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
