-- Revenue Recovered (§25): atomic "mark as recovered" + a fix the feature
-- newly exposes in the NBA engine.
--
-- Fix: calculate_next_best_action never checked opportunity.status, so a
-- closed WON/LOST deal (the first real path to WON is this phase) could still
-- surface "Follow up now" in the Action Center. Short-circuit closed deals.
create or replace function calculate_next_best_action(opp opportunities, risk jsonb)
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
  if opp.status in ('WON', 'LOST') then
    return jsonb_build_object(
      'action_type', 'MONITOR',
      'priority', 'LOW',
      'title', 'No action needed',
      'description', case opp.status
        when 'WON' then 'This opportunity is already won.'
        else 'This opportunity is closed as lost.'
      end,
      'reason', 'Opportunity is closed.'
    );
  end if;

  if opp.expected_close_date is not null then
    days_to_close := opp.expected_close_date - current_date;
    closing_soon := days_to_close <= 7;
  end if;

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

-- Atomic: closes the opportunity as WON and logs the RECOVERED revenue event
-- in one transaction. SECURITY INVOKER (default) so both writes still go
-- through the normal opportunities_update / revenue_events_insert RLS checks
-- — this does not bypass permissions, it just avoids a partial-write window.
create function mark_opportunity_recovered(target_opportunity_id uuid, recovered_amount numeric)
returns opportunities
language plpgsql
as $$
declare
  updated_opportunity opportunities;
begin
  if recovered_amount is null or recovered_amount < 0 then
    raise exception 'Recovered amount must be zero or greater';
  end if;

  update opportunities
  set status = 'WON'
  where id = target_opportunity_id
  returning * into updated_opportunity;

  if updated_opportunity is null then
    raise exception 'Opportunity not found or not accessible';
  end if;

  insert into revenue_events (organization_id, opportunity_id, event_type, amount, currency)
  values (
    updated_opportunity.organization_id,
    updated_opportunity.id,
    'RECOVERED',
    recovered_amount,
    updated_opportunity.currency
  );

  return updated_opportunity;
end;
$$;

revoke execute on function mark_opportunity_recovered(uuid, numeric) from public;
grant execute on function mark_opportunity_recovered(uuid, numeric) to authenticated;
