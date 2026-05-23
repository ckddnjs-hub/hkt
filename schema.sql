-- ================================================================
-- 복지ON - Supabase 스키마
-- Supabase 대시보드 > SQL Editor에서 실행하세요
-- ================================================================

-- ── 1. 복지 혜택 DB ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS welfare_benefits (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  category      TEXT,
  amount        TEXT,
  agency        TEXT,
  description   TEXT,
  conditions    JSONB    DEFAULT '{}',
  age_range     JSONB    DEFAULT '[0, 120]',
  tags          TEXT[]   DEFAULT '{}',
  documents     TEXT[]   DEFAULT '{}',
  apply_url     TEXT,
  apply_offline TEXT     DEFAULT '주민센터',
  difficulty    TEXT     DEFAULT 'medium',  -- easy / medium / hard
  process_days  INT      DEFAULT 30,
  is_active     BOOLEAN  DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. 뉴스/공지 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news_articles (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  summary      TEXT,
  content      TEXT,
  category     TEXT,
  source       TEXT,
  url          TEXT,
  urgent       BOOLEAN  DEFAULT FALSE,
  published_at DATE     DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. 익명 사용자 세션 (프로필 동기화) ──────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_data     JSONB    DEFAULT '{}',
  matched_benefits JSONB    DEFAULT '[]',
  region           TEXT,
  age_group        TEXT,   -- '20대', '30대', ...
  income_group     TEXT,   -- '30%이하', '50%이하', ...
  last_active      TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. 생애계획 (정책 인사이트용 집계) ───────────────────────────
CREATE TABLE IF NOT EXISTS life_plans (
  id           BIGSERIAL PRIMARY KEY,
  session_id   TEXT NOT NULL,
  plan_ids     TEXT[]   DEFAULT '{}',  -- 선택한 계획 ID 배열
  plan_data    JSONB    DEFAULT '{}',  -- 세부 데이터 (시기, 자녀 수 등)
  region       TEXT,
  age_group    TEXT,
  income_group TEXT,
  saved_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id)  -- 1 세션당 1건 (upsert용)
);

CREATE INDEX IF NOT EXISTS idx_lifeplans_region   ON life_plans(region);
CREATE INDEX IF NOT EXISTS idx_lifeplans_age      ON life_plans(age_group);
CREATE INDEX IF NOT EXISTS idx_lifeplans_saved    ON life_plans(saved_at DESC);

ALTER TABLE life_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "생애계획_공개_읽기" ON life_plans FOR SELECT USING (true);
CREATE POLICY "생애계획_공개_삽입" ON life_plans FOR INSERT WITH CHECK (true);
CREATE POLICY "생애계획_공개_수정" ON life_plans FOR UPDATE USING (true);

-- ── 6. 혜택 통계 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS benefit_stats (
  benefit_id        TEXT PRIMARY KEY REFERENCES welfare_benefits(id) ON DELETE CASCADE,
  view_count        INT DEFAULT 0,
  apply_click_count INT DEFAULT 0,
  save_count        INT DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── 인덱스 ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_benefits_category  ON welfare_benefits(category);
CREATE INDEX IF NOT EXISTS idx_benefits_active    ON welfare_benefits(is_active);
CREATE INDEX IF NOT EXISTS idx_news_category      ON news_articles(category);
CREATE INDEX IF NOT EXISTS idx_news_published     ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_region    ON user_sessions(region);
CREATE INDEX IF NOT EXISTS idx_sessions_active    ON user_sessions(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_stats_views        ON benefit_stats(view_count DESC);

-- ── updated_at 자동 갱신 함수 ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_benefits_updated
  BEFORE UPDATE ON welfare_benefits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_stats_updated
  BEFORE UPDATE ON benefit_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 혜택 조회수 증가 함수 (RPC) ──────────────────────────────────
CREATE OR REPLACE FUNCTION increment_benefit_view(p_benefit_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO benefit_stats (benefit_id, view_count)
  VALUES (p_benefit_id, 1)
  ON CONFLICT (benefit_id)
  DO UPDATE SET
    view_count = benefit_stats.view_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ── 신청 클릭수 증가 함수 (RPC) ─────────────────────────────────
CREATE OR REPLACE FUNCTION increment_benefit_apply(p_benefit_id TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO benefit_stats (benefit_id, apply_click_count)
  VALUES (p_benefit_id, 1)
  ON CONFLICT (benefit_id)
  DO UPDATE SET
    apply_click_count = benefit_stats.apply_click_count + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ── 지역별 통계 뷰 ──────────────────────────────────────────────
CREATE OR REPLACE VIEW region_stats AS
SELECT
  region,
  COUNT(*) AS user_count,
  AVG((profile_data->>'age')::INT) AS avg_age
FROM user_sessions
WHERE region IS NOT NULL
GROUP BY region
ORDER BY user_count DESC;

-- ── 인기 혜택 뷰 ────────────────────────────────────────────────
CREATE OR REPLACE VIEW popular_benefits AS
SELECT
  b.id, b.name, b.category, b.amount, b.agency,
  COALESCE(s.view_count, 0) AS views,
  COALESCE(s.apply_click_count, 0) AS applies
FROM welfare_benefits b
LEFT JOIN benefit_stats s ON b.id = s.benefit_id
WHERE b.is_active = TRUE
ORDER BY views DESC, applies DESC;

-- ── RLS (Row Level Security) ────────────────────────────────────
ALTER TABLE welfare_benefits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_articles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_stats     ENABLE ROW LEVEL SECURITY;

-- 혜택: 누구나 읽기, 관리자만 쓰기
CREATE POLICY "혜택_공개_읽기"    ON welfare_benefits FOR SELECT USING (true);
CREATE POLICY "혜택_공개_삽입"    ON welfare_benefits FOR INSERT WITH CHECK (true);
CREATE POLICY "혜택_공개_수정"    ON welfare_benefits FOR UPDATE USING (true);

-- 뉴스: 누구나 읽기
CREATE POLICY "뉴스_공개_읽기"    ON news_articles    FOR SELECT USING (true);
CREATE POLICY "뉴스_공개_삽입"    ON news_articles    FOR INSERT WITH CHECK (true);

-- 세션: 누구나 자신의 세션 CRUD
CREATE POLICY "세션_공개_읽기"    ON user_sessions    FOR SELECT USING (true);
CREATE POLICY "세션_공개_삽입"    ON user_sessions    FOR INSERT WITH CHECK (true);
CREATE POLICY "세션_공개_수정"    ON user_sessions    FOR UPDATE USING (true);

-- 통계: 누구나 읽기/증가
CREATE POLICY "통계_공개_읽기"    ON benefit_stats    FOR SELECT USING (true);
CREATE POLICY "통계_공개_삽입"    ON benefit_stats    FOR INSERT WITH CHECK (true);
CREATE POLICY "통계_공개_수정"    ON benefit_stats    FOR UPDATE USING (true);

-- ================================================================
-- 실행 완료 후 앱에서 '혜택 DB 시드' 버튼을 누르거나
-- 아래 쿼리로 데이터 확인:
-- SELECT * FROM welfare_benefits LIMIT 5;
-- SELECT * FROM popular_benefits;
-- ================================================================
