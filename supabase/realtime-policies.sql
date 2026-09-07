-- Independent AI — Supabase Realtime yetkilendirme (private channels)
-- Uygulama: `pnpm db:realtime:apply` (DIRECT_URL ile psql) veya Supabase SQL Editor.
-- Prisma migration'larına dahil DEĞİLDİR: realtime şeması yalnızca Supabase'de vardır.
--
-- Model:
--   topic  = 'tenant:<tenantId>'  → kullanıcı o tenant'a doğrudan üye (User.tenantId) VEYA
--                                    ajans üyesi olarak WorkspaceAccess/allClients ile erişiyor
--   topic  = 'agency:<agencyId>'  → kullanıcı o ajansın aktif üyesi
-- JWT claim'leri (apps/web/src/server/realtime.ts): user_id, tenant_id, session_version, topics[]
-- Politika hem JWT'yi hem GÜNCEL üyelik satırlarını kontrol eder; wildcard yok.

create or replace function public.iai_realtime_can_join(topic text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claims jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  v_user text := claims->>'user_id';
  v_sv int := coalesce((claims->>'session_version')::int, -1);
  v_topics jsonb := coalesce(claims->'topics', '[]'::jsonb);
  v_kind text;
  v_id text;
begin
  if v_user is null then return false; end if;

  -- Kanal adı: '<kind>:<id>' veya '<kind>:<id>:presence' (presence alt kanalı aynı yetkiyi kullanır).
  v_kind := split_part(topic, ':', 1);
  v_id := split_part(topic, ':', 2);
  if v_id = '' then return false; end if;
  if split_part(topic, ':', 3) not in ('', 'presence') then return false; end if;
  -- Token, listelenen topic'ler dışında bir kanala izin vermez (wildcard yok).
  if not (v_topics ? (v_kind || ':' || v_id)) then return false; end if;
  -- sessionVersion eski ise (logout-all, rol/tenant değişimi) reddet.
  if not exists (select 1 from public."User" u where u.id = v_user and u."sessionVersion" = v_sv) then
    return false;
  end if;

  if v_kind = 'tenant' then
    -- Doğrudan üye
    if exists (select 1 from public."User" u where u.id = v_user and u."tenantId" = v_id) then
      return true;
    end if;
    -- Ajans erişimi: aktif üyelik + (allClients veya WorkspaceAccess) + workspace ARCHIVED değil
    return exists (
      select 1
      from public."AgencyMembership" m
      join public."AgencyWorkspace" w on w."agencyId" = m."agencyId" and w."tenantId" = v_id
      left join public."WorkspaceAccess" a on a."membershipId" = m.id and a."workspaceId" = w.id
      where m."userId" = v_user and m.status = 'ACTIVE' and w.status <> 'ARCHIVED'
        and (m."allClients" = true or a.id is not null)
    );
  elsif v_kind = 'agency' then
    return exists (
      select 1 from public."AgencyMembership" m
      where m."userId" = v_user and m."agencyId" = v_id and m.status = 'ACTIVE'
    );
  end if;
  return false;
end;
$$;

revoke all on function public.iai_realtime_can_join(text) from public;
grant execute on function public.iai_realtime_can_join(text) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists "iai tenant/agency members can receive" on realtime.messages;
create policy "iai tenant/agency members can receive"
on realtime.messages
for select
to authenticated
using (
  realtime.messages.extension in ('broadcast', 'presence')
  and public.iai_realtime_can_join(realtime.topic())
);

-- İstemciden broadcast GÖNDERİMİ kapalı: yalnızca presence (çevrimiçi durumu) yazılabilir.
drop policy if exists "iai members can track presence" on realtime.messages;
create policy "iai members can track presence"
on realtime.messages
for insert
to authenticated
with check (
  realtime.messages.extension = 'presence'
  and public.iai_realtime_can_join(realtime.topic())
);

-- Sunucu yayınları realtime.send() ile (postgres rolü) yazılır; ek politika gerekmez.
