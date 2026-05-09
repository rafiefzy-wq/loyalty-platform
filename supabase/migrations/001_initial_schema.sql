-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- BUSINESSES
-- =====================
create table businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  type text not null default 'other', -- cafe, bakery, salon, restaurant, other
  logo_url text,
  brand_color text not null default '#000000',
  secondary_color text not null default '#ffffff',
  background_image_url text,
  font_choice text not null default 'inter', -- inter, playfair, montserrat, lato, poppins
  plan text not null default 'free_trial', -- free_trial, starter, growth, pro
  is_multi_location boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- LOCATIONS
-- =====================
create table locations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  name text not null,
  address text,
  city text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================
-- LOYALTY CARDS (templates)
-- =====================
create table loyalty_cards (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  stamp_goal integer not null default 10,
  reward_description text not null default '1 free item',
  card_scope text not null default 'all_locations', -- per_location | all_locations
  is_active boolean not null default true,
  -- Design fields
  strip_image_url text,
  icon_url text,
  background_color text not null default '#ffffff',
  foreground_color text not null default '#000000',
  label_color text not null default '#666666',
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================
-- EMPLOYEES
-- =====================
create table employees (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null default 'staff', -- owner | manager | staff
  email text not null,
  name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =====================
-- CUSTOMER PASSES
-- =====================
create table customer_passes (
  id uuid primary key default uuid_generate_v4(),
  loyalty_card_id uuid references loyalty_cards(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null, -- nullable for all_locations scope
  apple_pass_serial text unique,
  google_pass_id text unique,
  apple_push_token text,
  stamp_count integer not null default 0,
  pass_url text,
  customer_device text, -- 'apple' | 'google' | 'unknown'
  created_at timestamptz not null default now(),
  last_visited_at timestamptz
);

-- =====================
-- STAMP TRANSACTIONS
-- =====================
create table stamp_transactions (
  id uuid primary key default uuid_generate_v4(),
  customer_pass_id uuid references customer_passes(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null not null,
  employee_id uuid references employees(id) on delete set null,
  type text not null, -- stamp | reward_redeemed
  note text,
  created_at timestamptz not null default now()
);

-- =====================
-- EMPLOYEE INVITATIONS
-- =====================
create table employee_invitations (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  location_id uuid references locations(id) on delete set null,
  email text not null,
  role text not null default 'staff',
  token text unique not null default encode(gen_random_bytes(32), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

-- =====================
-- INDEXES
-- =====================
create index idx_businesses_owner_id on businesses(owner_id);
create index idx_locations_business_id on locations(business_id);
create index idx_loyalty_cards_business_id on loyalty_cards(business_id);
create index idx_employees_business_id on employees(business_id);
create index idx_employees_user_id on employees(user_id);
create index idx_customer_passes_loyalty_card_id on customer_passes(loyalty_card_id);
create index idx_stamp_transactions_customer_pass_id on stamp_transactions(customer_pass_id);
create index idx_stamp_transactions_location_id on stamp_transactions(location_id);
create index idx_stamp_transactions_created_at on stamp_transactions(created_at);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_businesses_updated_at
  before update on businesses
  for each row execute function update_updated_at_column();

create trigger update_loyalty_cards_updated_at
  before update on loyalty_cards
  for each row execute function update_updated_at_column();
