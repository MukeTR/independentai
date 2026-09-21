-- Yerel/test Postgres için Supabase realtime şeması STUB'ı.
-- Uygulama kodu `realtime.send(...)` çağırır; burada mesajlar bir tabloya yazılır ve testler
-- yayınlanan olayları/payload güvenliğini bu tablodan doğrular. (Her ifade tek satır biter: ";\n")
create schema if not exists realtime;
create table if not exists realtime.messages (id bigserial primary key, topic text not null, extension text not null default 'broadcast', event text, payload jsonb, private boolean not null default false, inserted_at timestamptz not null default now());
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void language sql as $$ insert into realtime.messages (topic, extension, event, payload, private) values (topic, 'broadcast', event, payload, private); $$;
create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
