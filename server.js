require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { EdgeTTS } = require('edge-tts-universal'); //

const app = express();
const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("⚠️ SUPABASE_URL 또는 SUPABASE_KEY 환경변수가 설정되지 않았습니다.");
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_KEY || '');

// 🔥 [해결 핵심] EdgeTTS 인스턴스를 라우터 외부(글로벌 변수)에서 딱 한 번만 생성합니다.
// 매번 new EdgeTTS()를 하면 웹소켓 연결이 꼬여서 중간 문장들이 안 나옵니다.
const ttsInstance = new EdgeTTS(); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 🔊 Edge TTS API 엔드포인트
app.get('/api/tts', async (req, res) => {
  const { text, lang } = req.query;

  if (!text) {
    return res.status(400).send("Text parameter is required");
  }

  const voice = lang === 'ko' ? 'ko-KR-SunHiNeural' : 'en-US-JennyNeural';
  const cleanText = text.replace(/<[^>]*>/g, '').trim();

  console.log(`🎙️ [SERVER Edge-TTS] 음성 합성 요청: "${cleanText}" (Voice: ${voice})`);

  try {
    // 💡 미리 생성된 글로벌 ttsInstance를 사용하고, 인자 값으로 voice 옵션을 전달합니다.
    const result = await ttsInstance.synthesize(cleanText, voice);
    const audioBuffer = Buffer.from(await result.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.send(audioBuffer);
    console.log(`✅ [SERVER Edge-TTS] MP3 전송 완료 (${audioBuffer.length} bytes)`);
  } catch (error) {
    console.error("❌ [SERVER Edge-TTS] 에러 발생:", error.message);
    
    // 만약 edge-tts-universal 버전에 따라 인자값 형식이 다를 경우를 대비한 Fallback 예외 처리
    try {
      const fallbackTts = new EdgeTTS({ voice: voice });
      const result = await fallbackTts.synthesize(cleanText);
      const audioBuffer = Buffer.from(await result.arrayBuffer());
      res.setHeader('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    } catch (fallbackError) {
      console.error("❌ [SERVER Edge-TTS] Fallback도 실패:", fallbackError.message);
      res.status(500).send("TTS_ERROR");
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
