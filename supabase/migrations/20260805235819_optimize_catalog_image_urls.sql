update public.products as product
set image_url = optimized.image_url
from (
  values
    ('5af1e6c3-c1c0-0fad-e128-333ca3bd8400'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/01_bowl_veggie.webp'),
    ('1232c37b-9b66-78d2-43af-285c23ddcd7b'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/02_salchipapa_normal.webp'),
    ('9f0aade8-f57c-b4b5-fb79-20d18c28300a'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/03_salchipapa_chilli.webp'),
    ('2422e354-e353-b8ca-626d-a97d577ca8cc'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/04_perro_americano.webp'),
    ('7b30fcd1-3614-a851-de5d-41f88318070f'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/04_perro_americano.webp'),
    ('5aa7e78f-c8fa-7fea-ed5e-336b33c84f60'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/06_mazorcada_costilla_barbacoa.webp'),
    ('a6a7b74e-8cc4-6f8e-32ce-889b317fe54d'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/07_combo_papas_bretana.webp'),
    ('4191c0dd-132f-f886-3492-6bcbe585de6f'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/08_combo_papas_cerveza.webp'),
    ('757dedc2-0103-e0b7-437d-d9c5a0a989f2'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/09_combo_papas_hatsu.webp'),
    ('7e822e94-6abd-9200-4f30-0ea75bce9ba2'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/10_combo_papas_soda_hatsu.webp'),
    ('b56d1e2e-39be-7471-350f-172ad123e560'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/agua_hatsu.webp'),
    ('d631af2e-93d7-44a9-0789-7cf0c824e773'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/bretana.webp'),
    ('a220d553-a3cc-aaf9-ee72-2f2536987f92'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/cerveza_rosada.webp'),
    ('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/hamburguesa_americana.webp'),
    ('abf6980b-d497-990b-fc8b-20803dbddb4f'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/hamburguesa_chilli.webp'),
    ('10f70e4e-febc-7e30-5b18-82247596262b'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/hamburguesa_doble.webp'),
    ('38650db9-cf3c-1027-10fd-a4fc7e3e0a91'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/heineken.webp'),
    ('cc24c60a-0a37-c3cf-83fc-5457548e8e88'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/nachos.webp'),
    ('14e103af-d4f3-fc8d-ff66-b6824460b578'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/soda_hatsu.webp'),
    ('8148b008-1231-e549-2fc6-dac5dec7c685'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/te_hatsu.webp'),
    ('edfc2bdb-d986-d364-5080-a7868f942bf4'::uuid, 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/optimized/catalog-20260804/veggie_bowl.webp')
) as optimized(id, image_url)
where product.id = optimized.id;
