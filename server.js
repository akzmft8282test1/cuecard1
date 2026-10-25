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
app.use(express.static(path.join(__dirname, 'public')));

// 라우팅
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

// API Endpoint
app.get('/api/cuecards', async (req, res) => {
  const { data: cards, error } = await supabase
    .from('cuecards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(cards || []);
});

app.post('/api/cuecards', async (req, res) => {
  const { title, v1, v2, v4, v5, v6, v7 } = req.body;
  const { data, error } = await supabase
    .from('cuecards')
    .insert([{ title, v1, v2, v4, v5, v6, v7 }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ success: true, card: data[0] });
});

app.delete('/api/cuecards/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('cuecards').delete().eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
