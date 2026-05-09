-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
alter table businesses enable row level security;
alter table locations enable row level security;
alter table loyalty_cards enable row level security;
alter table employees enable row level security;
alter table customer_passes enable row level security;
alter table stamp_transactions enable row level security;
alter table employee_invitations enable row level security;

-- =====================
-- HELPER FUNCTIONS
-- =====================

-- Returns the business_id for the currently authenticated user (as owner)
create or replace function get_my_business_id()
returns uuid as $$
  select id from businesses where owner_id = auth.uid() limit 1;
$$ language sql security definer stable;

-- Returns business_ids where the current user is an employee
create or replace function get_my_employee_business_ids()
returns setof uuid as $$
  select business_id from employees where user_id = auth.uid() and is_active = true;
$$ language sql security definer stable;

-- Returns true if current user owns the given business
create or replace function is_business_owner(bid uuid)
returns boolean as $$
  select exists (select 1 from businesses where id = bid and owner_id = auth.uid());
$$ language sql security definer stable;

-- Returns true if current user is an employee of the given business
create or replace function is_business_employee(bid uuid)
returns boolean as $$
  select exists (select 1 from employees where business_id = bid and user_id = auth.uid() and is_active = true);
$$ language sql security definer stable;

-- Returns true if current user is owner or employee of the given business
create or replace function can_access_business(bid uuid)
returns boolean as $$
  select is_business_owner(bid) or is_business_employee(bid);
$$ language sql security definer stable;

-- =====================
-- BUSINESSES POLICIES
-- =====================
create policy "Owners can view their own business"
  on businesses for select
  using (owner_id = auth.uid() or is_business_employee(id));

create policy "Owners can insert their own business"
  on businesses for insert
  with check (owner_id = auth.uid());

create policy "Owners can update their own business"
  on businesses for update
  using (owner_id = auth.uid());

create policy "Owners can delete their own business"
  on businesses for delete
  using (owner_id = auth.uid());

-- =====================
-- LOCATIONS POLICIES
-- =====================
create policy "Business members can view locations"
  on locations for select
  using (can_access_business(business_id));

create policy "Owners can insert locations"
  on locations for insert
  with check (is_business_owner(business_id));

create policy "Owners can update locations"
  on locations for update
  using (is_business_owner(business_id));

create policy "Owners can delete locations"
  on locations for delete
  using (is_business_owner(business_id));

-- =====================
-- LOYALTY CARDS POLICIES
-- =====================
create policy "Business members can view loyalty cards"
  on loyalty_cards for select
  using (can_access_business(business_id));

create policy "Owners can insert loyalty cards"
  on loyalty_cards for insert
  with check (is_business_owner(business_id));

create policy "Owners can update loyalty cards"
  on loyalty_cards for update
  using (is_business_owner(business_id));

create policy "Owners can delete loyalty cards"
  on loyalty_cards for delete
  using (is_business_owner(business_id));

-- =====================
-- EMPLOYEES POLICIES
-- =====================
create policy "Business members can view employees"
  on employees for select
  using (can_access_business(business_id));

create policy "Owners can insert employees"
  on employees for insert
  with check (is_business_owner(business_id));

create policy "Owners can update employees"
  on employees for update
  using (is_business_owner(business_id));

create policy "Owners can delete employees"
  on employees for delete
  using (is_business_owner(business_id));

-- =====================
-- CUSTOMER PASSES POLICIES
-- =====================
-- Employees and owners can view/manage passes for their business
create policy "Business members can view customer passes"
  on customer_passes for select
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = customer_passes.loyalty_card_id
      and can_access_business(lc.business_id)
    )
  );

-- Public insert (customers create their own passes via API with service role)
create policy "Service role can insert customer passes"
  on customer_passes for insert
  with check (true); -- Enforced at API layer

create policy "Business members can update customer passes"
  on customer_passes for update
  using (
    exists (
      select 1 from loyalty_cards lc
      where lc.id = customer_passes.loyalty_card_id
      and can_access_business(lc.business_id)
    )
  );

-- =====================
-- STAMP TRANSACTIONS POLICIES
-- =====================
create policy "Business members can view stamp transactions"
  on stamp_transactions for select
  using (
    exists (
      select 1 from customer_passes cp
      join loyalty_cards lc on lc.id = cp.loyalty_card_id
      where cp.id = stamp_transactions.customer_pass_id
      and can_access_business(lc.business_id)
    )
  );

create policy "Employees can insert stamp transactions"
  on stamp_transactions for insert
  with check (
    exists (
      select 1 from customer_passes cp
      join loyalty_cards lc on lc.id = cp.loyalty_card_id
      where cp.id = stamp_transactions.customer_pass_id
      and can_access_business(lc.business_id)
    )
  );

-- =====================
-- EMPLOYEE INVITATIONS POLICIES
-- =====================
create policy "Owners can view their invitations"
  on employee_invitations for select
  using (is_business_owner(business_id));

create policy "Owners can insert invitations"
  on employee_invitations for insert
  with check (is_business_owner(business_id));

create policy "Owners can delete invitations"
  on employee_invitations for delete
  using (is_business_owner(business_id));

-- Anyone can view an invitation by token (for acceptance flow — enforced at API layer)
create policy "Public can view invitations by token"
  on employee_invitations for select
  using (true);

create policy "Service role can update invitations"
  on employee_invitations for update
  with check (true);
