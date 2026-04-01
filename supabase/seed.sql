insert into public.products (name, category, description, cost_price, sale_price, image_url, active)
values
  ('Camiseta HK', 'Camisetas', 'Modelo leve para venda rapida.', 42.00, 79.90, '', true),
  ('Bone HK', 'Acessorios', 'Bone casual com foco em giro rapido.', 21.00, 49.90, '', true);

with base_products as (
  select id, name from public.products where name in ('Camiseta HK', 'Bone HK')
)
insert into public.product_variants (product_id, name, stock, extra_price)
select
  id,
  variation_name,
  stock,
  extra_price
from (
  values
    ('Camiseta HK', 'P', 8, 0.00::numeric),
    ('Camiseta HK', 'M', 6, 0.00::numeric),
    ('Bone HK', 'Unico', 10, 0.00::numeric)
) as seed(product_name, variation_name, stock, extra_price)
join base_products on base_products.name = seed.product_name
where not exists (
  select 1
  from public.product_variants pv
  where pv.product_id = base_products.id
    and pv.name = seed.variation_name
);
