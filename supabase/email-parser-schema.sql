-- Email Parser System Schema
-- Run this in Supabase SQL Editor

-- Table 1: Workflow State
CREATE TABLE IF NOT EXISTS email_parser_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'indexing', 'validating', 'enriching', 'complete', 'failed'
  current_agent TEXT, -- 'index', 'exchange_validator', 'enricher', 'validator'
  total_contacts INT DEFAULT 0,
  processed_contacts INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Agent Task Queue
CREATE TABLE IF NOT EXISTS email_parser_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES email_parser_workflow(id),
  agent TEXT NOT NULL, -- 'exchange_validator', 'enricher', 'document_extractor', 'validator'
  contact_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued', -- 'queued', 'processing', 'complete', 'failed'
  priority INT DEFAULT 0,
  input JSONB, -- agent-specific input data
  output JSONB, -- agent result
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_queue_status ON email_parser_queue(status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_queue_workflow ON email_parser_queue(workflow_id);

-- Table 3: Knowledge Base (learned patterns)
CREATE TABLE IF NOT EXISTS email_parser_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'client', 'loan_officer', 'realtor', 'title_escrow', 'attorney', 'family_friends'
  pattern_type TEXT NOT NULL, -- 'opener', 'subject', 'signature', 'document', 'domain'
  pattern TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  match_count INT DEFAULT 0, -- how many times this pattern matched
  source TEXT DEFAULT 'training', -- 'training', 'user_correction', 'definitive'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kb_category ON email_parser_knowledge_base(category, pattern_type);

-- Table 4: Processed Contacts
CREATE TABLE IF NOT EXISTS email_parser_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  alt_emails TEXT[], -- alternate email addresses found
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  alt_phones TEXT[],
  company TEXT,
  title TEXT,
  nmls TEXT,
  dre TEXT, -- for realtors
  classification TEXT, -- 'client', 'loan_officer', 'realtor', 'title_escrow', 'attorney', 'family_friends', 'unknown'
  confidence FLOAT,
  has_exchange BOOLEAN DEFAULT FALSE,
  total_emails INT DEFAULT 0,
  david_sent INT DEFAULT 0, -- emails David sent TO this contact
  david_received INT DEFAULT 0, -- emails David received FROM this contact
  first_contact_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  last_email_subject TEXT,
  last_email_summary TEXT,
  sample_subjects TEXT[],
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'unassigned', 'spam'
  pushed_to_ghl BOOLEAN DEFAULT FALSE,
  ghl_contact_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON email_parser_contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_classification ON email_parser_contacts(classification);

-- Table 5: User Corrections (for training)
CREATE TABLE IF NOT EXISTS email_parser_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,
  predicted_type TEXT,
  actual_type TEXT,
  user_note TEXT,
  pattern_learned TEXT, -- what pattern was extracted from this correction
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_corrections_email ON email_parser_corrections(contact_email);

-- Seed definitive patterns (100% accuracy)
INSERT INTO email_parser_knowledge_base (category, pattern_type, pattern, confidence, source) VALUES
  -- Loan Officer definitive signals
  ('loan_officer', 'signature', 'NMLS', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'NMLS #', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'NMLS:', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'MLO', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'Loan Officer', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'Mortgage Loan Originator', 1.0, 'definitive'),
  ('loan_officer', 'signature', 'Branch Manager', 0.9, 'definitive'),

  -- Client definitive signals (loan documents)
  ('client', 'document', 'Rate Lock', 1.0, 'definitive'),
  ('client', 'document', 'Loan Estimate', 1.0, 'definitive'),
  ('client', 'document', 'Closing Disclosure', 1.0, 'definitive'),
  ('client', 'document', 'Documentation Request', 1.0, 'definitive'),
  ('client', 'document', 'Pre-Approval', 1.0, 'definitive'),
  ('client', 'document', 'Pre-Qual', 1.0, 'definitive'),

  -- Realtor definitive signals
  ('realtor', 'signature', 'DRE#', 1.0, 'definitive'),
  ('realtor', 'signature', 'DRE #', 1.0, 'definitive'),
  ('realtor', 'signature', 'CalBRE', 1.0, 'definitive'),
  ('realtor', 'signature', 'Real Estate Agent', 1.0, 'definitive'),
  ('realtor', 'signature', 'Realtor', 0.9, 'definitive'),
  ('realtor', 'signature', 'Broker', 0.8, 'definitive'),

  -- Title/Escrow definitive signals
  ('title_escrow', 'signature', 'Escrow Officer', 1.0, 'definitive'),
  ('title_escrow', 'signature', 'Title Officer', 1.0, 'definitive'),
  ('title_escrow', 'domain', 'fidelity', 0.9, 'definitive'),
  ('title_escrow', 'domain', 'firstamerican', 0.9, 'definitive'),
  ('title_escrow', 'domain', 'chicagotitle', 0.9, 'definitive')
ON CONFLICT DO NOTHING;

-- Grant access
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
