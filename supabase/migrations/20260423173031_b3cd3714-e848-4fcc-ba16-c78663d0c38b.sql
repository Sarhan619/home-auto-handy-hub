ALTER TABLE public.vendors
ADD COLUMN IF NOT EXISTS contact_numbers text[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS government_id_doc_path text;