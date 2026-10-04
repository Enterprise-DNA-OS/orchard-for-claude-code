CREATE TABLE blocks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL,
 crop text NOT NULL, variety text NOT NULL, hectares numeric NOT NULL CHECK(hectares>0),
 workplace_address text NOT NULL, gap_expires date, planned_pick date, diary_reviewed date,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text UNIQUE NOT NULL, name text NOT NULL,
 training_expires date, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sprays (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text UNIQUE NOT NULL, block_id uuid NOT NULL REFERENCES blocks,
 worker_id uuid NOT NULL REFERENCES workers, product text NOT NULL, applied_at timestamptz NOT NULL,
 amount numeric NOT NULL CHECK(amount>0), unit text NOT NULL CHECK(unit IN ('L','kg')),
 wind_speed_kmh numeric CHECK(wind_speed_kmh>=0), wind_direction text, boundary_measures text,
 whp_days integer CHECK(whp_days>=0), rei_hours integer CHECK(rei_hours>=0), label_ref text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE harvests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text UNIQUE NOT NULL, block_id uuid NOT NULL REFERENCES blocks,
 picked_at timestamptz NOT NULL, bins integer NOT NULL CHECK(bins>0), kg numeric NOT NULL CHECK(kg>0),
 destination text, docket text, status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','recorded')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE labour (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text UNIQUE NOT NULL, block_id uuid NOT NULL REFERENCES blocks,
 worker_id uuid NOT NULL REFERENCES workers, worked_on date NOT NULL, activity text NOT NULL,
 hours numeric NOT NULL CHECK(hours>0 AND hours<=24), cost numeric NOT NULL CHECK(cost>=0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tasks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text UNIQUE NOT NULL, block_id uuid NOT NULL REFERENCES blocks,
 title text NOT NULL, due date NOT NULL, owner text NOT NULL, status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE irrigation (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ref text UNIQUE NOT NULL, block_id uuid NOT NULL REFERENCES blocks,
 watered_on date NOT NULL, source text NOT NULL, litres numeric NOT NULL CHECK(litres>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), block_id uuid NOT NULL REFERENCES blocks,
 body text NOT NULL CHECK(length(trim(body))>0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['blocks','workers','sprays','harvests','labour','tasks','irrigation','notes'] LOOP
 EXECUTE format('CREATE TRIGGER touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',t);
END LOOP; END $$;
CREATE INDEX sprays_block_date ON sprays(block_id,applied_at);
CREATE INDEX harvests_block_date ON harvests(block_id,picked_at);
CREATE INDEX labour_block_date ON labour(block_id,worked_on);
CREATE VIEW block_readiness AS
SELECT b.id,b.code,b.name AS block,b.crop,b.variety,b.hectares,b.planned_pick,b.gap_expires,b.diary_reviewed,
 max(s.applied_at+s.whp_days*interval '1 day') AS pick_after,
 max(s.applied_at+s.rei_hours*interval '1 hour') AS enter_after,
 count(s.id) FILTER(WHERE s.whp_days IS NULL OR s.rei_hours IS NULL OR nullif(trim(s.label_ref),'') IS NULL) AS unknown_rules,
 CASE WHEN b.diary_reviewed IS NULL OR b.diary_reviewed<current_date-7 THEN 'REVIEW DIARY'
 WHEN count(s.id) FILTER(WHERE s.whp_days IS NULL OR s.rei_hours IS NULL OR nullif(trim(s.label_ref),'') IS NULL)>0 THEN 'CHECK LABEL'
 WHEN max(s.applied_at+s.whp_days*interval '1 day')>now() THEN 'WITHHOLD'
 WHEN max(s.applied_at+s.rei_hours*interval '1 hour')>now() THEN 'REENTRY HOLD'
 ELSE 'REVIEW BEFORE PICK' END AS decision
FROM blocks b LEFT JOIN sprays s ON s.block_id=b.id GROUP BY b.id;
CREATE VIEW block_performance AS
SELECT b.id,b.code,b.name AS block,b.variety,b.hectares,
 coalesce(h.kg,0) AS kg,round(coalesce(h.kg,0)/b.hectares,2) AS kg_per_hectare,
 coalesce(h.bins,0) AS bins,coalesce(l.hours,0) AS hours,coalesce(l.cost,0) AS labour_cost,
 round(l.cost/nullif(h.kg,0),3) AS labour_cost_per_kg,
 coalesce(i.litres,0) AS irrigation_litres,round(i.litres/nullif(h.kg,0),2) AS litres_per_kg
FROM blocks b
LEFT JOIN (SELECT block_id,sum(kg) kg,sum(bins) bins FROM harvests GROUP BY block_id) h ON h.block_id=b.id
LEFT JOIN (SELECT block_id,sum(hours) hours,sum(cost) cost FROM labour GROUP BY block_id) l ON l.block_id=b.id
LEFT JOIN (SELECT block_id,sum(litres) litres FROM irrigation GROUP BY block_id) i ON i.block_id=b.id;
CREATE VIEW orchard_attention AS
SELECT 'high'::text AS priority,b.code AS block,'harvest held'::text AS issue,h.ref AS reference FROM harvests h JOIN blocks b ON b.id=h.block_id WHERE h.status='held'
UNION ALL SELECT 'high',code,decision,code FROM block_readiness WHERE decision<>'REVIEW BEFORE PICK'
UNION ALL SELECT 'medium',b.code,'overdue: '||t.title,t.ref FROM tasks t JOIN blocks b ON b.id=t.block_id WHERE t.status='open' AND t.due<current_date
UNION ALL SELECT 'medium',code,'GAP certificate missing or expired',code FROM blocks WHERE gap_expires IS NULL OR gap_expires<current_date
UNION ALL SELECT 'medium',b.code,'harvest destination or docket missing',h.ref FROM harvests h JOIN blocks b ON b.id=h.block_id WHERE nullif(trim(h.destination),'') IS NULL OR nullif(trim(h.docket),'') IS NULL;
