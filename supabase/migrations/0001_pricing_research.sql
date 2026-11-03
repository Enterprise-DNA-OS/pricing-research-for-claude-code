create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create function preserve_evidence() returns trigger language plpgsql as $$ begin raise exception 'Evidence is append-only. Record a review or a new study.'; end $$;
create table studies (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 currency text not null check(currency ~ '^[A-Z]{3}$'), price_unit text not null,
 owner text not null, purpose text not null, notice_ref text not null default '',
 access_review_on date, retention_review_on date, review_due date not null,
 min_sample integer not null default 30 check(min_sample between 2 and 100000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table imports (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references studies,
 file_sha256 text not null, mapping jsonb not null, source_ref text not null, actor text not null,
 source_count integer not null check(source_count>0), inserted_count integer not null check(inserted_count>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table responses (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references studies,
 import_id uuid not null references imports, respondent_key text not null, segment text not null,
 completed boolean not null, too_cheap numeric(14,4), cheap numeric(14,4), expensive numeric(14,4), too_expensive numeric(14,4),
 evidence_hash text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(study_id,respondent_key), check(too_cheap>=0 and cheap>=0 and expensive>=0 and too_expensive>=0)
);
create table response_reviews (
 id uuid primary key default gen_random_uuid(), sequence bigint generated always as identity unique,
 response_id uuid not null references responses, excluded boolean not null, reason text not null check(length(trim(reason))>0), actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table actions (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references studies, title text not null,
 owner text not null, due_on date not null, status text not null default 'open' check(status in ('open','closed')),
 closure_evidence text, closed_by text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'closed' or (coalesce(length(trim(closure_evidence)),0)>0 and coalesce(length(trim(closed_by)),0)>0))
);
create table decisions (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references studies, title text not null,
 proposed_price numeric(14,4) not null check(proposed_price>=0), rationale text not null, evidence_ref text not null,
 actor text not null, review_on date not null, snapshot jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table notes (
 id uuid primary key default gen_random_uuid(), study_id uuid not null references studies, body text not null, actor text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table events (
 id uuid primary key default gen_random_uuid(), study_id uuid references studies, kind text not null, actor text not null, detail jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index responses_study_idx on responses(study_id);
create index reviews_response_idx on response_reviews(response_id,sequence desc);
do $$ declare t text; begin
 foreach t in array array['studies','imports','responses','response_reviews','actions','decisions','notes','events'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_updated()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 end loop;
 foreach t in array array['imports','responses','response_reviews','decisions','notes','events'] loop
 execute format('create trigger immutable before update or delete on %I for each row execute function preserve_evidence()',t);
 end loop;
end $$;
create view v_response_quality as
select r.*, coalesce(v.excluded,false) as manually_excluded, v.reason as review_reason,
 case when not completed then 'incomplete'
 when too_cheap is null or cheap is null or expensive is null or too_expensive is null then 'missing price'
 when not (too_cheap<=cheap and cheap<=expensive and expensive<=too_expensive) then 'inconsistent order'
 when coalesce(v.excluded,false) then 'review exclusion' else 'eligible' end as quality
from responses r left join lateral (select excluded,reason from response_reviews v where v.response_id=r.id order by sequence desc limit 1) v on true;
create view v_sample as
select s.id as study_id,s.name,s.currency,s.price_unit,s.min_sample,count(r.id)::int as imported,
 count(r.id) filter(where r.quality='eligible')::int as eligible,
 count(r.id) filter(where r.quality<>'eligible')::int as excluded
from studies s left join v_response_quality r on r.study_id=s.id group by s.id;
create view v_segments as
select r.study_id,r.segment,count(*)::int as imported,count(*) filter(where quality='eligible')::int as eligible,
 count(*) filter(where quality<>'eligible')::int as excluded from v_response_quality r group by r.study_id,r.segment;
create view v_curves as
with usable as (select * from v_response_quality where quality='eligible'),
 prices as (select distinct study_id,unnest(array[too_cheap,cheap,expensive,too_expensive]) as price from usable)
select p.study_id,p.price,count(*)::int as sample,
 round(100.0*count(*) filter(where r.too_cheap>=p.price)/count(*),4) as too_cheap_pct,
 round(100.0*count(*) filter(where r.cheap>=p.price)/count(*),4) as cheap_pct,
 round(100.0*count(*) filter(where r.expensive<=p.price)/count(*),4) as expensive_pct,
 round(100.0*count(*) filter(where r.too_expensive<=p.price)/count(*),4) as too_expensive_pct
from prices p join usable r on p.study_id=r.study_id group by p.study_id,p.price;
create view v_compliance as
select id as study_id,'notice' as rule,'Record the research notice or collection basis reference' as issue from studies where trim(notice_ref)=''
union all select id,'access','Access review missing or overdue' from studies where access_review_on is null or access_review_on<current_date
union all select id,'retention','Retention review missing or overdue' from studies where retention_review_on is null or retention_review_on<current_date
union all select id,'purpose','Research purpose or owner missing' from studies where trim(purpose)='' or trim(owner)='';
create view v_attention as
select s.id as study_id,s.name as study,'study-review' as kind,s.owner,s.name as item,s.review_due as due_on from studies s where s.review_due<current_date
union all select a.study_id,s.name,'action',a.owner,a.title,a.due_on from actions a join studies s on s.id=a.study_id where a.status='open' and a.due_on<current_date
union all select v.study_id,v.name,'small-sample',s.owner,'Eligible responses below agreed minimum',null::date from v_sample v join studies s on s.id=v.study_id where v.eligible<v.min_sample
union all select c.study_id,s.name,c.rule,s.owner,c.issue,null::date from v_compliance c join studies s on s.id=c.study_id
union all select d.study_id,s.name,'decision-review',d.actor,d.title,d.review_on from decisions d join studies s on s.id=d.study_id where review_on<current_date;
