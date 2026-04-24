-- Lowercase all fortune text for consistent tone.
UPDATE `fortune` SET `text` = lower(`text`);
