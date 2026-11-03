insert into studies(id,name,currency,price_unit,owner,purpose,notice_ref,access_review_on,retention_review_on,review_due,min_sample) values
('10000000-0000-4000-8000-000000000001','Harbour Coffee subscription','NZD','monthly subscription','Aroha Demo','Explore stated price perceptions for a fictional coffee subscription','Fictional study notice v1',current_date+30,current_date+60,current_date-3,6),
('10000000-0000-4000-8000-000000000002','Harbour Coffee gift box','AUD','one gift box','Lee Demo','Explore a fictional seasonal gift box','',current_date-2,current_date-1,current_date+7,30)
on conflict(id) do nothing;
insert into imports(id,study_id,file_sha256,mapping,source_ref,actor,source_count,inserted_count) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','fictional-seed','{}','Fictional demonstration only','Demo seed',10,10)
on conflict(id) do nothing;
insert into responses(id,study_id,import_id,respondent_key,segment,completed,too_cheap,cheap,expensive,too_expensive,evidence_hash)
select ('30000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','DEMO-'||n,
case when n<=5 then 'Existing subscribers' else 'New buyers' end,n<>9,tc,c,e,te,'fictional-'||n
from (values (1,10,20,30,40),(2,12,22,32,42),(3,14,24,34,44),(4,16,26,36,46),(5,18,28,38,48),(6,8,16,24,32),(7,10,18,26,34),(8,12,20,28,36),(9,10,20,30,40),(10,40,20,30,50)) x(n,tc,c,e,te)
on conflict(id) do nothing;
insert into actions(id,study_id,title,owner,due_on) values
('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Review inconsistent response DEMO-10','Aroha Demo',current_date-2),
('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','Confirm the gift-box research notice','Lee Demo',current_date+3)
on conflict(id) do nothing;
