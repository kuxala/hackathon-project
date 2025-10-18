-- Create predictions table to store generated expense predictions
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prediction_month TEXT NOT NULL, -- Format: YYYY-MM
  total_predicted_expenses NUMERIC(12, 2) NOT NULL,
  category_predictions JSONB NOT NULL, -- Array of {category, amount, confidence}
  insights JSONB, -- Array of insight strings
  warnings JSONB, -- Array of warning strings
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  months_analyzed INTEGER NOT NULL,
  historical_data JSONB, -- Array of historical monthly data used
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);

-- Create index for user + prediction month (unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_predictions_user_month ON predictions(user_id, prediction_month);

-- Create index for sorting by generated_at
CREATE INDEX IF NOT EXISTS idx_predictions_generated_at ON predictions(generated_at DESC);

-- Enable Row Level Security
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only see their own predictions
CREATE POLICY "Users can view own predictions"
  ON predictions FOR SELECT
  USING (auth.uid() = user_id);

-- Create RLS policy: Users can insert their own predictions
CREATE POLICY "Users can insert own predictions"
  ON predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can update their own predictions
CREATE POLICY "Users can update own predictions"
  ON predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: Users can delete their own predictions
CREATE POLICY "Users can delete own predictions"
  ON predictions FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE predictions IS 'Stores AI-generated expense predictions for users';
