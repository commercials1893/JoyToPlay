-- Údaje k videím pro karty: akordy, barré, kapodastr, jazyk návodu (2026-10-25).
-- NULL = neuvedeno. capo 0 = bez kapodastru, jinak číslo pražce.
ALTER TABLE videos ADD COLUMN chords TEXT;
ALTER TABLE videos ADD COLUMN barre INTEGER;
ALTER TABLE videos ADD COLUMN capo INTEGER;
ALTER TABLE videos ADD COLUMN lang TEXT;
