-- 在 Supabase Dashboard > SQL Editor 貼上並執行這段，就會建立好 people 資料表

create table if not exists people (
  id bigint generated always as identity primary key,
  no text not null,
  name text not null,
  kana text,
  type text not null check (type in ('idol', 'actor', 'concafe')),
  group_name text,
  rarity text not null check (rarity in ('N', 'R', 'SR', 'SSR', 'UR')),
  photo_url text,
  collected boolean not null default false,
  created_at timestamptz not null default now()
);

-- 先開放所有人可以「讀取」資料（前台圖鑑要能顯示），
-- 之後如果要開放多使用者各自的收藏狀態，記得改成更嚴謹的規則
alter table people enable row level security;

create policy "允許所有人讀取 people"
  on people for select
  using (true);

-- 這條先讓 anon key 也能更新 collected 狀態，方便雛型測試用
-- 正式上線、且要多人共用時，建議改成只允許登入使用者更新，或改成 user_collections 拆表
create policy "允許所有人更新 people"
  on people for update
  using (true);

-- 範例資料，可以直接執行，之後再換成你自己的人物
insert into people (no, name, kana, type, group_name, rarity, collected) values
  ('001', '星野 陽菜', 'ホシノ ヒナ', 'idol', 'Prism*Link', 'UR', true),
  ('002', '百合川 澪', 'ユリカワ ミオ', 'idol', 'Prism*Link', 'SR', true),
  ('003', '橘 あかり', 'タチバナ アカリ', 'idol', 'Prism*Link', 'R', false);
