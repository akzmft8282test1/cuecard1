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

// 🔊 Edge TTS 고품질 음성 바이너리 반환 API 엔드포인트
app.get('/api/tts', async (req, res) => {
  const { text, lang } = req.query;

  if (!text) {
    return res.status(400).send("Text parameter is required");
  }

  // 특수문자 및 태그 제거
  const cleanText = encodeURIComponent(text.replace(/<[^>]*>/g, '').trim());
  console.log(`🎙️ [SERVER Edge-TTS] 요청 텍스트: "${text}" [언어: ${lang}]`);

  try {
    // Edge Neural Voice 호환 스트림 URL
    const targetLang = lang === 'ko' ? 'zh' : 'eng';
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${cleanText}&le=${targetLang}&type=2`;

    const response = await fetch(audioUrl);

    if (!response.ok) {
      throw new Error(`Edge Voice 서버 응답 실패 (Status: ${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 올바른 MP3 헤더 설정
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.send(buffer);
    console.log(`✅ [SERVER Edge-TTS] MP3 전송 완료 (${buffer.length} bytes)`);
  } catch (error) {
    console.error("❌ [SERVER Edge-TTS] 음성 생성 실패:", error.message);
    res.status(500).send("TTS 생성 오류");
  }
});

// 라우트 설정
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/add', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'add.html'));
});

app.get('/del', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'del.html'));
});

// API Endpoints
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
