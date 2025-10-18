 Backend & Bank Statement Upload System Plan

     Overview

     Build a comprehensive file upload, storage, and AI-powered analysis system for bank statements using Supabase + Next.js with 
     support for CSV, Excel, and PDF files.

     ---
     1. Database Schema (Supabase Tables)

     user_accounts

     - id (uuid, primary key)
     - user_id (uuid, foreign key to auth.users)
     - account_name (text) - e.g., "Chase Checking"
     - account_type (text) - checking, savings, credit_card
     - currency (text) - USD, EUR, etc.
     - created_at (timestamp)

     bank_statements

     - id (uuid, primary key)
     - account_id (uuid, foreign key)
     - file_name (text)
     - file_size (bigint)
     - file_type (text) - csv, xlsx, pdf
     - file_url (text) - Supabase Storage URL
     - upload_date (timestamp)
     - statement_period_start (date)
     - statement_period_end (date)
     - status (text) - pending, processing, completed, failed
     - parsed_data (jsonb) - structured transaction data

     transactions

     - id (uuid, primary key)
     - account_id (uuid, foreign key)
     - statement_id (uuid, foreign key)
     - date (date)
     - description (text)
     - amount (numeric)
     - category (text) - AI-categorized
     - merchant (text)
     - transaction_type (text) - debit, credit
     - balance (numeric)
     - ai_confidence (numeric) - category confidence score

     ai_insights

     - id (uuid, primary key)
     - user_id (uuid, foreign key)
     - account_id (uuid, foreign key)
     - insight_type (text) - spending_pattern, budget_recommendation, anomaly
     - title (text)
     - description (text)
     - data (jsonb) - detailed analysis data
     - generated_at (timestamp)

     ---
     2. Supabase Storage Buckets

     bank-statements bucket

     - Private bucket (requires authentication)
     - Folders organized by: {user_id}/{account_id}/{statement_id}/
     - File retention policy: configurable
     - Max file size: 10MB

     ---
     3. API Routes Structure

     /api/upload (POST)

     - Accept file upload (CSV/XLSX/PDF)
     - Validate file type and size
     - Parse file in browser (preview)
     - Upload raw file to Supabase Storage
     - Store metadata in bank_statements table
     - Trigger background processing

     /api/parse (POST)

     - Parse uploaded file into structured data
     - Extract transactions with fields: date, description, amount, balance
     - Handle multiple CSV/Excel formats (auto-detect columns)
     - For PDFs: use text extraction library

     /api/categorize (POST)

     - Send transactions to AI for categorization
     - Use OpenRouter API (already configured)
     - Batch process transactions
     - Store results in transactions table

     /api/insights (POST)

     - Trigger AI analysis for spending insights
     - Generate budget recommendations
     - Detect anomalies/unusual spending
     - Store in ai_insights table

     /api/accounts (GET/POST/PATCH/DELETE)

     - CRUD operations for user bank accounts
     - List all accounts with summary stats

     /api/transactions (GET)

     - Fetch transactions with filtering (date range, category, account)
     - Pagination support
     - Search functionality

     ---
     4. File Parsing Libraries

     Install dependencies:

     - pdf-parse - PDF text extraction
     - csv-parse - CSV parsing (already have xlsx)
     - pdf-lib - PDF manipulation (if needed)

     Parser service (/src/services/fileParser.ts)

     - Detect file format
     - Auto-detect column mapping (flexible schema)
     - Support common bank formats (Chase, BofA, Wells Fargo, etc.)
     - Fallback to manual column mapping if needed

     ---
     5. AI Integration

     Categorization prompt template

     - Input: transaction description, amount, merchant
     - Output: category, confidence score
     - Categories: Food & Dining, Transportation, Bills & Utilities, Shopping, Entertainment, Healthcare, Income, etc.

     Insights generation

     - Analyze spending patterns over time
     - Compare month-over-month trends
     - Identify top spending categories
     - Suggest budget allocations
     - Flag unusual transactions (> 2σ from average)

     ---
     6. Frontend Components

     FileUploadWidget component

     - Drag & drop zone
     - File preview before upload
     - Progress indicator during upload
     - Auto-parse preview (show first 10 transactions)

     AccountSelector component

     - Dropdown to select/create bank accounts
     - Account summary cards

     TransactionTable component

     - Paginated transaction list
     - Filters: date range, category, amount range
     - Search by description/merchant
     - Edit category (manual override)

     InsightsPanel component

     - Display AI-generated insights
     - Interactive charts (spending by category)
     - Budget vs. actual comparison

     ---
     7. Implementation Order

     Phase 1: Core Upload & Storage

     1. Create Supabase tables and storage bucket
     2. Build /api/upload endpoint
     3. Implement file upload widget with progress
     4. Store files in Supabase Storage

     Phase 2: File Parsing

     5. Build CSV/Excel parser service
     6. Create /api/parse endpoint
     7. Extract transactions and store in DB
     8. Add PDF parsing support

     Phase 3: AI Features

     9. Implement /api/categorize with AI
     10. Build insights generation service
     11. Create /api/insights endpoint
     12. Add anomaly detection

     Phase 4: Multi-Account Support

     13. Build account management UI
     14. Implement /api/accounts endpoints
     15. Add account selector to dashboard
     16. Update charts to filter by account

     Phase 5: Polish & Extensions

     17. Add transaction editing/manual categorization
     18. Build advanced filtering/search
     19. Export functionality (download transactions)
     20. Recurring transaction detection

     ---
     8. Key Files to Create/Modify

     New files:

     - /src/lib/supabase/schema.sql - DB schema
     - /src/services/fileParser.ts - File parsing logic
     - /src/services/aiCategorization.ts - AI categorization
     - /src/services/insightsGenerator.ts - Insights generation
     - /src/app/api/upload/route.ts - Upload endpoint
     - /src/app/api/parse/route.ts - Parse endpoint
     - /src/app/api/categorize/route.ts - Categorization endpoint
     - /src/app/api/insights/route.ts - Insights endpoint
     - /src/app/api/accounts/route.ts - Account management
     - /src/app/api/transactions/route.ts - Transaction queries
     - /src/components/dashboard/FileUploadWidget.tsx
     - /src/components/dashboard/TransactionTable.tsx
     - /src/components/dashboard/AccountSelector.tsx
     - /src/components/dashboard/InsightsPanel.tsx

     Modified files:

     - /src/app/dashboard/DashboardExample.tsx - Integrate real data
     - /src/app/dashboard/components/*.tsx - Use real transaction data

     ---
     9. Security Considerations

     - Row Level Security (RLS) on all Supabase tables
     - Validate file types server-side
     - Scan for malicious content
     - Rate limiting on upload endpoints
     - Sanitize parsed transaction data
     - Encrypt sensitive data at rest

     Ready to implement? 🚀
  ⎿

⏺ Excellent! Let's start implementing. I'll begin with Phase 1: Core Upload & Storage.