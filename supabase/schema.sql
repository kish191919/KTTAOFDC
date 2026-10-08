-- KTTA of DC 홈페이지가 쓰는 테이블과 파일 저장 공간입니다.
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여 넣고 Run 을 누릅니다. 여러 번 실행해도 됩니다.

-- 글 내용. 항목 하나가 한 줄이고, data 칸에 lib/types.ts 의 모양 그대로 들어갑니다.
create table if not exists public.tournaments (id text primary key, data jsonb not null);
create table if not exists public.albums (id text primary key, data jsonb not null);
create table if not exists public.news_posts (id text primary key, data jsonb not null);
-- 메인 화면 동영상·이미지. position 이 작은 것부터 홈 화면에 나옵니다.
create table if not exists public.hero_media (
  id text primary key,
  data jsonb not null,
  position integer not null
);

-- 홈페이지 서버(secret key)만 읽고 쓸 수 있게 합니다.
-- RLS 를 켜고 정책을 만들지 않으므로 브라우저용 키로는 아무것도 보이지 않습니다.
alter table public.tournaments enable row level security;
alter table public.albums enable row level security;
alter table public.news_posts enable row level security;
alter table public.hero_media enable row level security;

revoke all on table public.tournaments, public.albums, public.news_posts, public.hero_media
  from anon, authenticated;
grant select, insert, update, delete
  on table public.tournaments, public.albums, public.news_posts, public.hero_media
  to service_role;

-- 사진·동영상·첨부 파일. 주소를 아는 사람은 누구나 볼 수 있는 공개 버킷이고,
-- 올리기·지우기는 홈페이지 서버만 할 수 있습니다. 파일 하나는 50MB 까지 받습니다.
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', true, 52428800)
on conflict (id) do nothing;
