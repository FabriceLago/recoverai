-- Only flag "High-value opportunity" for deals of 10 000 or more (value_score 25).
-- Previously any deal from 3 000 (value_score 20) got the label, which read wrong
-- for a 3 200 deal. The score itself is unchanged.
create or replace function calculate_risk_score(opp opportunities)
returns jsonb
language plpgsql
stable
as $$
declare
  days_since_contact int;
  time_score int;
  value_score int;
  engagement_score int;
  deadline_score int;
  total_score int;
  risk_level text;
  explanation jsonb := '[]'::jsonb;
  days_to_close int;
begin
  days_since_contact := floor(
    extract(epoch from (now() - coalesce(opp.last_contact_at, opp.created_at))) / 86400
  )::int;

  time_score := case
    when days_since_contact <= 3 then 0
    when days_since_contact <= 7 then 10
    when days_since_contact <= 14 then 25
    when days_since_contact <= 21 then 40
    else 50
  end;

  value_score := case
    when opp.value < 1000 then 5
    when opp.value < 3000 then 10
    when opp.value < 10000 then 20
    else 25
  end;

  -- ponytail: "recent"/"few"/"no" replies has no explicit numeric cutoff in the
  -- spec; recent = has replies and last outbound contact within 7 days, few =
  -- has replies but stale contact, none = reply_count is zero. Revisit if a
  -- dedicated last-reply timestamp is added.
  engagement_score := case
    when opp.reply_count = 0 then 20
    when opp.last_contact_at is not null and opp.last_contact_at >= now() - interval '7 days' then 0
    else 10
  end;

  deadline_score := 0;
  if opp.expected_close_date is not null then
    days_to_close := opp.expected_close_date - current_date;
    if days_to_close <= 7 then
      deadline_score := 20;
    end if;
  end if;

  total_score := least(time_score + value_score + engagement_score + deadline_score, 100);

  risk_level := case
    when total_score >= 80 then 'CRITICAL'
    when total_score >= 60 then 'HIGH'
    when total_score >= 30 then 'MEDIUM'
    else 'LOW'
  end;

  if time_score > 0 then
    explanation := explanation || jsonb_build_array(days_since_contact::text || ' days without contact');
  end if;
  if value_score >= 25 then
    explanation := explanation || jsonb_build_array('High-value opportunity');
  end if;
  if engagement_score >= 20 then
    explanation := explanation || jsonb_build_array('No responses yet');
  elsif engagement_score >= 10 then
    explanation := explanation || jsonb_build_array('Low engagement');
  end if;
  if deadline_score > 0 then
    explanation := explanation || jsonb_build_array('Closing date approaching');
  end if;

  return jsonb_build_object(
    'score', total_score,
    'risk_level', risk_level,
    'time_score', time_score,
    'value_score', value_score,
    'engagement_score', engagement_score,
    'deadline_score', deadline_score,
    'explanation', explanation
  );
end;
$$;
