-- Update usage_logs check constraint to include 'visual' and 'high_yield'
ALTER TABLE public.usage_logs DROP CONSTRAINT IF EXISTS usage_logs_feature_check;

ALTER TABLE public.usage_logs ADD CONSTRAINT usage_logs_feature_check 
CHECK (feature IN (
  'ai_tutor',
  'flashcard_gen',
  'math_solver',
  'quick_study',
  'teach_it',
  'mistake_journal',
  'cram',
  'practice',
  'recall',
  'visual',
  'high_yield'
));
