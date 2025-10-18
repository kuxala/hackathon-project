-- Simple transactions table (no accounts, no statements)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  balance DECIMAL(12, 2),
  category TEXT,
  category_confidence DECIMAL(3, 2),
  file_url TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_bank ON transactions(bank_name);

-- Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (user_id = auth.uid());

-- AI Insights table (simplified)
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for insights
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_generated_at ON ai_insights(generated_at DESC);

-- Row Level Security for insights
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights" ON ai_insights
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own insights" ON ai_insights
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own insights" ON ai_insights
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own insights" ON ai_insights
  FOR DELETE USING (user_id = auth.uid());
