-- Developer accounts
CREATE TABLE developer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_developer_accounts_email ON developer_accounts(email);

-- Developer roles
CREATE TABLE developer_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    developer_id UUID REFERENCES developer_accounts(id) ON DELETE CASCADE,
    title_id UUID,
    role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'developer', 'analyst', 'support')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(developer_id, title_id, role)
);

CREATE INDEX idx_developer_roles_developer_id ON developer_roles(developer_id);
CREATE INDEX idx_developer_roles_title_id ON developer_roles(title_id);

-- Titles
CREATE TABLE titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    developer_id UUID REFERENCES developer_accounts(id) ON DELETE CASCADE,
    secret_key VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_titles_developer_id ON titles(developer_id);
CREATE INDEX idx_titles_secret_key ON titles(secret_key);

-- Title settings
CREATE TABLE title_settings (
    title_id UUID PRIMARY KEY REFERENCES titles(id) ON DELETE CASCADE,
    allow_anonymous_login BOOLEAN DEFAULT TRUE,
    require_email_verification BOOLEAN DEFAULT FALSE,
    max_players_per_title INTEGER DEFAULT 1000000,
    data_retention_days INTEGER DEFAULT 365,
    allow_cross_play BOOLEAN DEFAULT TRUE,
    custom_settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Player accounts
CREATE TABLE player_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    username VARCHAR(255),
    email VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    banned BOOLEAN DEFAULT FALSE,
    ban_expires TIMESTAMP,
    UNIQUE(title_id, username),
    UNIQUE(title_id, email)
);

CREATE INDEX idx_player_accounts_title_id ON player_accounts(title_id);
CREATE INDEX idx_player_accounts_email ON player_accounts(email);
CREATE INDEX idx_player_accounts_username ON player_accounts(username);

-- Linked accounts
CREATE TABLE linked_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('email', 'google', 'facebook', 'steam', 'apple', 'custom', 'anonymous')),
    platform_user_id VARCHAR(255) NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, platform),
    UNIQUE(platform, platform_user_id)
);

CREATE INDEX idx_linked_accounts_player_id ON linked_accounts(player_id);
CREATE INDEX idx_linked_accounts_platform ON linked_accounts(platform, platform_user_id);

-- Virtual currencies
CREATE TABLE virtual_currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    initial_deposit INTEGER DEFAULT 0,
    recharge_rate INTEGER,
    recharge_max INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_virtual_currencies_title_id ON virtual_currencies(title_id);

-- Player virtual currency balances
CREATE TABLE player_currency_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
    currency_id UUID REFERENCES virtual_currencies(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    last_recharged_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, currency_id)
);

CREATE INDEX idx_player_currency_balances_player_id ON player_currency_balances(player_id);

-- Catalog versions
CREATE TABLE catalog_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(title_id, version)
);

-- Catalog items
CREATE TABLE catalog_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    catalog_version_id UUID REFERENCES catalog_versions(id) ON DELETE CASCADE,
    item_id VARCHAR(255) NOT NULL,
    item_class VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    virtual_currency_prices JSONB DEFAULT '{}'::jsonb,
    real_money_prices JSONB DEFAULT '{}'::jsonb,
    tags TEXT[],
    custom_data JSONB DEFAULT '{}'::jsonb,
    consumable_config JSONB,
    container_config JSONB,
    bundle_config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(title_id, catalog_version_id, item_id)
);

CREATE INDEX idx_catalog_items_title_id ON catalog_items(title_id);
CREATE INDEX idx_catalog_items_catalog_version ON catalog_items(catalog_version_id);

-- Leaderboards
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    statistic_name VARCHAR(255) NOT NULL,
    reset_frequency VARCHAR(20) CHECK (reset_frequency IN ('never', 'hour', 'day', 'week', 'month')),
    aggregation_method VARCHAR(20) CHECK (aggregation_method IN ('last', 'min', 'max', 'sum')),
    last_reset_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(title_id, statistic_name)
);

CREATE INDEX idx_leaderboards_title_id ON leaderboards(title_id);

-- Leaderboard entries
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID REFERENCES leaderboards(id) ON DELETE CASCADE,
    player_id UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
    statistic_value BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(leaderboard_id, player_id)
);

CREATE INDEX idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX idx_leaderboard_entries_value ON leaderboard_entries(leaderboard_id, statistic_value DESC);

-- Scheduled tasks
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schedule VARCHAR(255) NOT NULL,
    function_name VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    next_run_at TIMESTAMP,
    last_run_at TIMESTAMP,
    last_run_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scheduled_tasks_title_id ON scheduled_tasks(title_id);
CREATE INDEX idx_scheduled_tasks_next_run ON scheduled_tasks(next_run_at) WHERE enabled = TRUE;

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_webhooks_title_id ON webhooks(title_id);

-- Segments
CREATE TABLE segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL,
    player_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_segments_title_id ON segments(title_id);

-- A/B Tests
CREATE TABLE ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title_id UUID REFERENCES titles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    variants JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'completed')),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    target_segment_id UUID REFERENCES segments(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ab_tests_title_id ON ab_tests(title_id);

-- Player A/B test assignments
CREATE TABLE player_ab_test_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
    ab_test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, ab_test_id)
);

CREATE INDEX idx_player_ab_test_assignments_player ON player_ab_test_assignments(player_id);
CREATE INDEX idx_player_ab_test_assignments_test ON player_ab_test_assignments(ab_test_id);

-- Session tokens
CREATE TABLE session_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES player_accounts(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX idx_session_tokens_player_id ON session_tokens(player_id);
CREATE INDEX idx_session_tokens_token ON session_tokens(token_hash);
CREATE INDEX idx_session_tokens_refresh ON session_tokens(refresh_token_hash);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_developer_accounts_updated_at BEFORE UPDATE ON developer_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_titles_updated_at BEFORE UPDATE ON titles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_title_settings_updated_at BEFORE UPDATE ON title_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_catalog_items_updated_at BEFORE UPDATE ON catalog_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_scheduled_tasks_updated_at BEFORE UPDATE ON scheduled_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_segments_updated_at BEFORE UPDATE ON segments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
