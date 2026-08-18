-- Sample "existing" Postgres: a small shop schema with realistic data.
-- This is the DB you'll connect NocoDB to, to feel the "connect to your own Postgres" flow.

CREATE TABLE customers (
  id          bigserial PRIMARY KEY,
  email       text UNIQUE NOT NULL,
  full_name   text,
  plan        text NOT NULL DEFAULT 'free',
  is_active   boolean NOT NULL DEFAULT true,
  mrr         numeric(10,2) NOT NULL DEFAULT 0,
  country     varchar(2),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          bigserial PRIMARY KEY,
  sku         text UNIQUE NOT NULL,
  name        text NOT NULL,
  price       numeric(10,2) NOT NULL,
  in_stock    integer NOT NULL DEFAULT 0
);

CREATE TABLE orders (
  id           bigserial PRIMARY KEY,
  customer_id  bigint NOT NULL REFERENCES customers(id),
  status       text NOT NULL DEFAULT 'pending',
  total        numeric(10,2) NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  order_id    bigint NOT NULL REFERENCES orders(id),
  product_id  bigint NOT NULL REFERENCES products(id),
  qty         integer NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id)   -- composite PK, on purpose
);

-- customers
INSERT INTO customers (email, full_name, plan, is_active, mrr, country, created_at)
SELECT
  'user' || g || '@corp.io',
  (ARRAY['James Reyes','Maria Kim','Chen Novak','Omar Haddad','Priya Singh','Lucas Meyer','Emma Costa','Noah Larsen','Sofia Okafor','Hana Sato', NULL])[1 + (g % 11)],
  (ARRAY['free','free','pro','team','enterprise'])[1 + (g % 5)],
  (g % 5 <> 0),
  (ARRAY[0,0,29,49,99,299])[1 + (g % 6)],
  (ARRAY['US','GB','DE','MN','JP','FR','BR','IN','CA','AU'])[1 + (g % 10)],
  now() - (g || ' days')::interval
FROM generate_series(1, 500) g;

-- products
INSERT INTO products (sku, name, price, in_stock)
SELECT
  'SKU-' || lpad(g::text, 4, '0'),
  (ARRAY['Widget','Gadget','Sprocket','Cog','Bolt','Panel','Sensor','Module'])[1 + (g % 8)] || ' ' || (ARRAY['Mini','Pro','Max','Lite','X'])[1 + (g % 5)],
  round((5 + (g * 7 % 400))::numeric, 2),
  (g * 13 % 250)
FROM generate_series(1, 120) g;

-- orders
INSERT INTO orders (customer_id, status, total, created_at)
SELECT
  1 + (g % 500),
  (ARRAY['pending','paid','shipped','refunded','cancelled'])[1 + (g % 5)],
  round((10 + (g * 17 % 900))::numeric, 2),
  now() - (g % 90 || ' days')::interval
FROM generate_series(1, 2000) g;

-- order_items (composite PK exercise)
INSERT INTO order_items (order_id, product_id, qty)
SELECT DISTINCT ON (o, p) o, p, 1 + (o % 4)
FROM (
  SELECT 1 + (g % 2000) AS o, 1 + (g * 3 % 120) AS p
  FROM generate_series(1, 5000) g
) s(o, p);

-- a view + a table with NO primary key (to see how the tool treats them)
CREATE VIEW customer_orders_v AS
  SELECT c.id AS customer_id, c.email, count(o.id) AS orders, coalesce(sum(o.total),0) AS spent
  FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
  GROUP BY c.id, c.email;

CREATE TABLE audit_log (   -- deliberately no PK
  at      timestamptz NOT NULL DEFAULT now(),
  actor   text,
  action  text,
  detail  text
);
INSERT INTO audit_log (actor, action, detail)
SELECT 'user' || (g%50) || '@corp.io', (ARRAY['login','update','delete','export'])[1+(g%4)], 'row ' || g
FROM generate_series(1, 300) g;
