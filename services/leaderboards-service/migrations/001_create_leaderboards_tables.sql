-- Leaderboards service database schema

-- Leaderboards table
CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  leaderboard_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  statistic_name VARCHAR(100) NOT NULL,
  sort_order VARCHAR(20) NOT NULL CHECK (sort_order IN ('ascending', 'descending')),
  reset_frequency VARCHAR(20) NOT NULL CHECK (reset_frequency IN ('never', 'hourly', 'daily', 'weekly', 'monthly')),
  max_entries INTEGER NOT NULL DEFAULT 100,
  last_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
  next_reset_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(title_id, leaderboard_name)
);

-- Player statistics table
CREATE TABLE IF NOT EXISTS player_statistics (
  id SERIAL PRIMARY KEY,
  title_id UUID NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  player_id VARCHAR(255) NOT NULL,
  statistic_name VARCHAR(100) NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(title_id, player_id, statistic_name)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leaderboards_title_id ON leaderboards(title_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_statistic_name ON leaderboards(statistic_name);
CREATE INDEX IF NOT EXISTS idx_leaderboards_next_reset ON leaderboards(next_reset_at) WHERE reset_frequency != 'never';

CREATE INDEX IF NOT EXISTS idx_player_statistics_title_player ON player_statistics(title_id, player_id);
CREATE INDEX IF NOT EXISTS idx_player_statistics_statistic ON player_statistics(title_id, statistic_name);
CREATE INDEX IF NOT EXISTS idx_player_statistics_value ON player_statistics(title_id, statistic_name, value DESC);

-- Comments
COMMENT ON TABLE leaderboards IS 'Stores leaderboard configurations';
COMMENT ON TABLE player_statistics IS 'Stores player statistics that feed into leaderboards';

COMMENT ON COLUMN leaderboards.reset_frequency IS 'How often the leaderboard resets: never, hourly, daily, weekly, monthly';
COMMENT ON COLUMN leaderboards.sort_order IS 'Whether higher or lower values are better: ascending, descending';
COMMENT ON COLUMN leaderboards.max_entries IS 'Maximum number of entries to keep in the leaderboard';
COMMENT ON COLUMN leaderboards.next_reset_at IS 'When the leaderboard will next reset (NULL for never)';
