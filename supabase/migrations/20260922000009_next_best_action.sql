-- Next Best Action engine (§16). Replaces the Phase 6 risk-only trigger with a
-- combined one: risk is computed once per write and feeds both risk_scores and
-- recommended_actions, instead of two triggers each recalculating it.
--
-- Fix: the Phase 6 trigger function was not SECURITY DEFINER, so under RLS it
-- would have failed to insert into risk_scores (that table intentionally has no
-- client-facing INSERT policy — writes are meant to be system-generated). Both
-- functions below are SECURITY DEFINER so they can write regardless of the
-- invoking user's own table permissions, same pattern as the Phase 4 helpers.

drop trigger if exists opportunities_sync_risk_score on opportunities;
drop function if exists sync_risk_score();

create function calculate_next_best_action(opp opportunities, risk jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  risk_level text := risk ->> 'risk_level';
  action_type text;
  priority text;
  title text;
  description text;
  reason text;
  days_to_close int;
  closing_soon boolean := false;
begin
  if opp.expected_close_date is not null then
    days_to_close := opp.expected_close_date - current_date;
    closing_soon := days_to_close <= 7;
  end if;

  -- ponytail: the spec gives 4 example rules (CRITICAL+no response, HIGH+closing
  -- soon, MEDIUM+recent silence, LOW). This generalizes them into a complete
  -- mapping so every risk level always resolves to an action.
  if risk_level = 'CRITICAL' then
    action_type := 'FOLLOW_UP_NOW';
  elsif risk_level = 'HIGH' and closing_soon then
    action_type := 'FOLLOW_UP_TODAY';
  elsif risk_level in ('HIGH', 'MEDIUM') then
    action_type := 'FOLLOW_UP_SOON';
  else
    action_type := 'MONITOR';
  end if;

  priority := case action_type
    when 'FOLLOW_UP_NOW' then 'URGENT'
    when 'FOLLOW_UP_TODAY' then 'HIGH'
    when 'FOLLOW_UP_SOON' then 'MEDIUM'
    else 'LOW'
  end;

  title := case action_type
    when 'FOLLOW_UP_NOW' then 'Follow up now'
    when 'FOLLOW_UP_TODAY' then 'Follow up today'
    when 'FOLLOW_UP_SOON' then 'Follow up soon'
    else 'Monitor'
  end;

  description := case action_type
    when 'FOLLOW_UP_NOW' then 'This opportunity is at critical risk of being lost.'
    when 'FOLLOW_UP_TODAY' then 'Risk is high and the closing date is approaching.'
    when 'FOLLOW_UP_SOON' then 'Engagement has gone quiet; a nudge will keep this warm.'
    else 'This opportunity looks healthy — no action needed right now.'
  end;

  select string_agg(elem, ' · ') into reason
  from jsonb_array_elements_text(risk -> 'explanation') as elem;

  if reason is null or reason = '' then
    reason := 'No specific risk factors detected.';
  end if;

  return jsonb_build_object(
    'action_type', action_type,
    'priority', priority,
    'title', title,
    'description', description,
    'reason', reason
  );
end;
$$;

create function sync_opportunity_derivatives()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  risk jsonb;
  action jsonb;
  existing_id uuid;
begin
  risk := calculate_risk_score(new);

  insert into risk_scores (
    opportunity_id, score, risk_level, time_score, value_score, engagement_score, deadline_score, explanation
  ) values (
    new.id,
    (risk ->> 'score')::int,
    risk ->> 'risk_level',
    (risk ->> 'time_score')::int,
    (risk ->> 'value_score')::int,
    (risk ->> 'engagement_score')::int,
    (risk ->> 'deadline_score')::int,
    risk -> 'explanation'
  );

  action := calculate_next_best_action(new, risk);

  select id into existing_id
  from recommended_actions
  where opportunity_id = new.id and status = 'PENDING'
  limit 1;

  if existing_id is not null then
    update recommended_actions
    set action_type = action ->> 'action_type',
        priority = action ->> 'priority',
        title = action ->> 'title',
        description = action ->> 'description',
        reason = action ->> 'reason'
    where id = existing_id;
  else
    insert into recommended_actions (opportunity_id, action_type, priority, title, description, reason)
    values (
      new.id,
      action ->> 'action_type',
      action ->> 'priority',
      action ->> 'title',
      action ->> 'description',
      action ->> 'reason'
    );
  end if;

  return new;
end;
$$;

create trigger opportunities_sync_derivatives
  after insert or update on opportunities
  for each row execute function sync_opportunity_derivatives();
