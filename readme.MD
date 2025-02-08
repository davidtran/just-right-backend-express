alter table questions alter column content type text;
alter table questions alter column short_answer type text;
alter table questions alter column detail_answer type text;
alter table questions add column is_deleted boolean default false;
