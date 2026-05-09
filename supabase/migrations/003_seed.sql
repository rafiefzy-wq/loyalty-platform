-- Seed data for development only
-- Run after 001 and 002 migrations

-- Note: In production, businesses are created via the onboarding flow.
-- This seed creates a demo business for local testing.

-- Insert a demo business (owner must be created via Supabase Auth first)
-- Replace 'YOUR_USER_UUID' with an actual auth.users UUID after signing up locally.

/*
insert into businesses (id, owner_id, name, slug, type, brand_color, secondary_color, plan)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'YOUR_USER_UUID',
  'Demo Coffee Co.',
  'demo-coffee-co',
  'cafe',
  '#6f4e37',
  '#fff8f0',
  'free_trial'
);

insert into locations (id, business_id, name, address, city, country)
values (
  'a1b2c3d4-0000-0000-0000-000000000002',
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Main Street Branch',
  '123 Main Street',
  'London',
  'UK'
);

insert into loyalty_cards (id, business_id, stamp_goal, reward_description, card_scope, background_color, foreground_color)
values (
  'a1b2c3d4-0000-0000-0000-000000000003',
  'a1b2c3d4-0000-0000-0000-000000000001',
  10,
  '1 free coffee',
  'all_locations',
  '#fff8f0',
  '#6f4e37'
);
*/

-- The above is commented out. Uncomment and replace YOUR_USER_UUID after local auth setup.
select 1; -- no-op so migration doesn't fail
