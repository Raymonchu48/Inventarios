-- Ejecuta este script en Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  stock_code text unique,
  descripcion text not null,
  presentacion text,
  st_date text,
  unit text,
  cantidad numeric(12,2) not null default 0,
  cantidad_original text,
  detalle_cantidad text,
  pagina integer,
  categoria_id uuid references public.categorias(id) on delete set null,
  min_stock numeric(12,2) not null default 0,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada','salida','ajuste')),
  cantidad numeric(12,2) not null,
  stock_anterior numeric(12,2) not null default 0,
  stock_nuevo numeric(12,2) not null default 0,
  nota text,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_productos_updated_at on public.productos;
create trigger trg_productos_updated_at
before update on public.productos
for each row execute function public.set_updated_at();

alter table public.categorias enable row level security;
alter table public.productos enable row level security;
alter table public.movimientos enable row level security;

drop policy if exists "categorias public read" on public.categorias;
create policy "categorias public read" on public.categorias for select using (true);
drop policy if exists "categorias public insert" on public.categorias;
create policy "categorias public insert" on public.categorias for insert with check (true);
drop policy if exists "categorias public update" on public.categorias;
create policy "categorias public update" on public.categorias for update using (true);
drop policy if exists "categorias public delete" on public.categorias;
create policy "categorias public delete" on public.categorias for delete using (true);

drop policy if exists "productos public read" on public.productos;
create policy "productos public read" on public.productos for select using (true);
drop policy if exists "productos public insert" on public.productos;
create policy "productos public insert" on public.productos for insert with check (true);
drop policy if exists "productos public update" on public.productos;
create policy "productos public update" on public.productos for update using (true);
drop policy if exists "productos public delete" on public.productos;
create policy "productos public delete" on public.productos for delete using (true);

drop policy if exists "movimientos public read" on public.movimientos;
create policy "movimientos public read" on public.movimientos for select using (true);
drop policy if exists "movimientos public insert" on public.movimientos;
create policy "movimientos public insert" on public.movimientos for insert with check (true);
drop policy if exists "movimientos public update" on public.movimientos;
create policy "movimientos public update" on public.movimientos for update using (true);
drop policy if exists "movimientos public delete" on public.movimientos;
create policy "movimientos public delete" on public.movimientos for delete using (true);

create index if not exists idx_productos_categoria_id on public.productos(categoria_id);
create index if not exists idx_productos_stock_code on public.productos(stock_code);
create index if not exists idx_productos_descripcion on public.productos(descripcion);
create index if not exists idx_movimientos_producto_id on public.movimientos(producto_id);
create index if not exists idx_movimientos_created_at on public.movimientos(created_at desc);