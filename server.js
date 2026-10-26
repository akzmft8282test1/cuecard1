require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { EdgeTTS } = require('edge-tts-universal'); // 라이브러리 로드

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

// 🔊 Edge TTS API 엔드포인트
app.get('/api/tts', async (req, res) => {
  const { text, lang } = req.query;

  if (!text) {
    return res.status(400).send("Text parameter is required");
  }

  // 1. 요청된 lang에 맞춰 정확한 AI 성우 매핑
  const voice = lang === 'ko' ? 'ko-KR-SunHiNeural' : 'en-US-JennyNeural';
  const cleanText = text.replace(/<[^>]*>/g, '').trim();

  console.log(`🎙️ [SERVER Edge-TTS] 음성 합성 요청: "${cleanText}" (Voice: ${voice})`);

  try {
    // 2. [가장 중요] 해당 라이브러리의 안정적인 호출 규격에 맞춰 인스턴스 생성 및 옵션 주입
    const tts = new EdgeTTS({
      voice: voice,
      lang: lang === 'ko' ? 'ko-KR' : 'en-US',
      outputFormat: 'audio-24khz-48kbps-mono-silk'
    });

    // 3. 문장 합성 실행
    const result = await tts.synthesize(cleanText);
    
    // 4. 버퍼 데이터 변환 및 응답 전송
    const audioBuffer = Buffer.from(await result.arrayBuffer());

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
    res.send(audioBuffer);
    console.log(`✅ [SERVER Edge-TTS] MP3 전송 완료 (${audioBuffer.length} bytes)`);
  } catch (error) {
    console.error("❌ [SERVER Edge-TTS] 에러 발생:", error.message);
    
    // 버전 호환성을 위한 2차 예외 처리 (Fallback fallback)
    try {
      const { MsEdgeTTS } = require('edge-tts-universal');
      const fallbackTts = new MsEdgeTTS();
      fallbackTts.setMetadata(voice, 'audio-24khz-48kbps-mono-silk');
      
      const readableStream = fallbackTts.toStream(cleanText);
      res.setHeader('Content-Type', 'audio/mpeg');
      readableStream.pipe(res);
      console.log(`✅ [SERVER Edge-TTS Fallback] 스트림 전송 완료`);
    } catch (fallbackError) {
      console.error("❌ [SERVER Edge-TTS] 완전 실패:", fallbackError.message);
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
  res.status(201).json({ success: true, card: data });
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
