-- Fix missing profiles
insert into public.profiles (id, full_name, email, plan, streak_days, onboarding_complete)
select id, raw_user_meta_data->>'full_name', email, 'free', 0, true
from auth.users
where not exists (select 1 from public.profiles where profiles.id = auth.users.id);

-- Ensure RLS allows usage_logs
alter table public.usage_logs enable row level security;
drop policy if exists "Users can insert their own usage logs" on usage_logs;
drop policy if exists "Users can view their own usage logs" on usage_logs;

create policy "Users can insert their own usage logs"
on usage_logs for insert
with check (auth.uid() = user_id);

create policy "Users can view their own usage logs"
on usage_logs for select
using (auth.uid() = user_id);
