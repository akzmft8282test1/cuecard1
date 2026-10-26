require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const EdgeTTS = require('edge-tts-node');

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

// 🔊 Edge Neural TTS API 엔드포인트
app.get('/api/tts', async (req, res) => {
  const { text, lang } = req.query;

  if (!text) {
    return res.status(400).json({ error: "Text parameter is required" });
  }

  // 한국어: ko-KR-SunHiNeural / 영어: en-US-JennyNeural
  const voice = lang === 'ko' ? 'ko-KR-SunHiNeural' : 'en-US-JennyNeural';
  console.log(`🎙️ [SERVER Edge-TTS] 음성 합성 요청: "${text}" (Voice: ${voice})`);

  try {
    let audioBuffer;

    // 1. edge-tts-node 모듈 API 규격 호출
    if (typeof EdgeTTS === 'function') {
      const tts = new EdgeTTS({ voice });
      if (typeof tts.synthesize === 'function') {
        const result = await tts.synthesize(text);
        audioBuffer = typeof result.audioBuffer === 'function' ? await result.audioBuffer() : result;
      } else if (typeof tts.toBuffer === 'function') {
        audioBuffer = await tts.toBuffer(text);
      }
    } else if (EdgeTTS && typeof EdgeTTS.getAudio === 'function') {
      audioBuffer = await EdgeTTS.getAudio(text, voice);
    }

    // 2. 만약 패키지 호출 실패 시 고품질 Edge API 엔드포인트 폴백
    if (!audioBuffer) {
      const encodeText = encodeURIComponent(text);
      const fallbackLang = lang === 'ko' ? 'zh' : 'eng';
      const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeText}&le=${fallbackLang}&type=2`;
      
      const response = await fetch(fallbackUrl);
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(audioBuffer);
    
    console.log(`✅ [SERVER Edge-TTS] 음성 변환 및 응답 완료: "${text}"`);
  } catch (error) {
    console.error("❌ [SERVER Edge-TTS] 합성 실패 후 폴백 진행:", error.message);
    try {
      // 에러 발생 시 2차 자동 안전 폴백
      const encodeText = encodeURIComponent(text);
      const fallbackLang = lang === 'ko' ? 'zh' : 'eng';
      const fallbackUrl = `https://dict.youdao.com/dictvoice?audio=${encodeText}&le=${fallbackLang}&type=2`;
      
      const response = await fetch(fallbackUrl);
      const arrayBuffer = await response.arrayBuffer();
      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(Buffer.from(arrayBuffer));
    } catch (fallbackError) {
      res.status(500).json({ error: fallbackError.message });
    }
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
