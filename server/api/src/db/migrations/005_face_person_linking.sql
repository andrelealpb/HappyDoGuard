-- Add person_id to face_embeddings to link multiple captures of the same person.
-- All captures are kept for search accuracy, but identical faces share a person_id.

ALTER TABLE face_embeddings
  ADD COLUMN IF NOT EXISTS person_id UUID;

CREATE INDEX IF NOT EXISTS idx_face_embeddings_person_id
  ON face_embeddings(person_id) WHERE person_id IS NOT NULL;

-- Count distinct person_ids (not individual face captures) for visitor counting
-- This replaces the old clustering approach with a pre-computed linkage
