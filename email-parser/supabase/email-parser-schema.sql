-- Email Parser Schema for Supabase
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/izcbxqaemlaabpmnqsmm/sql

-- ============================================
-- Table: email_parser_contacts
-- Stores all extracted contact data
-- ============================================
CREATE TABLE IF NOT EXISTS email_parser_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phones TEXT[], -- Array of phone numbers
  company TEXT,
  title TEXT,
  nmls TEXT,
  dre TEXT,

  -- Classification
  classification TEXT, -- 'client', 'loan_officer', 'realtor', 'title_escrow', 'attorney', 'family_friends', 'insurance', 'accountant', 'coworker', 'unknown'
  tags TEXT[], -- Multiple tags allowed
  confidence FLOAT DEFAULT 0,
  notes TEXT,

  -- Email exchange data
  has_exchange BOOLEAN DEFAULT FALSE,
  total_emails INT DEFAULT 0,
  david_sent INT DEFAULT 0,
  david_received INT DEFAULT 0,
  first_email_date TIMESTAMPTZ,
  last_email_date TIMESTAMPTZ,
  last_email_summary TEXT,

  -- Extraction metadata
  extraction_source TEXT, -- 'batch', 'orchestrator', 'manual'
  emails_processed INT DEFAULT 0,
  sample_signatures TEXT[], -- Store sample signatures for debugging

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'spam', 'unassigned'
  pushed_to_ghl BOOLEAN DEFAULT FALSE,
  ghl_contact_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_contacts_email ON email_parser_contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON email_parser_contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_classification ON email_parser_contacts(classification);

-- ============================================
-- Table: email_parser_workflow
-- Tracks overall parsing workflow state
-- ============================================
CREATE TABLE IF NOT EXISTS email_parser_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'indexing', 'extracting', 'classifying', 'complete', 'failed'
  current_agent TEXT, -- 'index_builder', 'batch_extract', 'orchestrator', 'enricher'

  -- Progress tracking
  total_contacts INT DEFAULT 0,
  processed_contacts INT DEFAULT 0,

  -- Extraction stats
  phones_extracted INT DEFAULT 0,
  nmls_extracted INT DEFAULT 0,
  dre_extracted INT DEFAULT 0,
  companies_extracted INT DEFAULT 0,
  titles_extracted INT DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Error handling
  error TEXT,
  last_error_at TIMESTAMPTZ,
  retry_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Table: email_parser_extraction_log
-- Logs every extraction attempt for debugging
-- ============================================
CREATE TABLE IF NOT EXISTS email_parser_extraction_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES email_parser_workflow(id),
  contact_email TEXT NOT NULL,

  -- What was extracted
  extracted_phones TEXT[],
  extracted_nmls TEXT,
  extracted_dre TEXT,
  extracted_company TEXT,
  extracted_title TEXT,

  -- Extraction details
  signature_sample TEXT, -- First 500 chars of signature used
  was_base64_decoded BOOLEAN DEFAULT FALSE,
  mbox_file TEXT, -- Which mbox file

  -- Status
  success BOOLEAN DEFAULT TRUE,
  error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extraction_log_email ON email_parser_extraction_log(contact_email);
CREATE INDEX IF NOT EXISTS idx_extraction_log_workflow ON email_parser_extraction_log(workflow_id);

-- ============================================
-- Table: email_parser_knowledge_base
-- Learned patterns for classification
-- ============================================
CREATE TABLE IF NOT EXISTS email_parser_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'client', 'loan_officer', 'realtor', etc.
  pattern_type TEXT NOT NULL, -- 'opener', 'subject', 'signature', 'document', 'email_domain'
  pattern TEXT NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source TEXT, -- 'training', 'user_correction', 'auto_detected'
  times_matched INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_category ON email_parser_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_pattern_type ON email_parser_knowledge_base(pattern_type);

-- ============================================
-- Table: email_parser_corrections
-- User corrections for training
-- ============================================
CREATE TABLE IF NOT EXISTS email_parser_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_email TEXT NOT NULL,

  -- What was predicted vs actual
  predicted_classification TEXT,
  actual_classification TEXT,
  predicted_company TEXT,
  actual_company TEXT,
  predicted_title TEXT,
  actual_title TEXT,

  -- User feedback
  user_note TEXT,
  corrected_by TEXT DEFAULT 'user',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrections_email ON email_parser_corrections(contact_email);

-- ============================================
-- Enable Row Level Security (optional)
-- ============================================
-- ALTER TABLE email_parser_contacts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_parser_workflow ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_parser_extraction_log ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_parser_knowledge_base ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE email_parser_corrections ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function: Update timestamp on change
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to contacts table
DROP TRIGGER IF EXISTS update_contacts_updated_at ON email_parser_contacts;
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON email_parser_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Apply trigger to knowledge base table
DROP TRIGGER IF EXISTS update_knowledge_updated_at ON email_parser_knowledge_base;
CREATE TRIGGER update_knowledge_updated_at
  BEFORE UPDATE ON email_parser_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
