const fs = require('fs');
let content = fs.readFileSync('master_setup.sql', 'utf8');

// Ensure score column is altered to numeric in case it was created as integer previously
const alterScore = `
-- Ensure study_activity score is numeric
DO $$
BEGIN
  ALTER TABLE public.study_activity ALTER COLUMN score TYPE numeric;
EXCEPTION
  WHEN undefined_table THEN
    -- Do nothing if table somehow doesn't exist
END $$;
`;

content += '\n' + alterScore;
fs.writeFileSync('master_setup.sql', content, 'utf8');
