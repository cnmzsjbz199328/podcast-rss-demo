-- 添加TTS相关字段到episodes表
ALTER TABLE episodes ADD COLUMN tts_event_id TEXT;
ALTER TABLE episodes ADD COLUMN tts_status TEXT DEFAULT 'pending';
ALTER TABLE episodes ADD COLUMN tts_error TEXT;

-- 将现有记录的audio_url和audio_key设置为可空
-- 注意：SQLite不支持直接修改列属性，所以我们只能通过新建表来实现
-- 但为了不丢失数据，我们保持现有结构，只添加新字段
