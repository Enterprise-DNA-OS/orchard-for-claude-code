INSERT INTO blocks(code,name,crop,variety,hectares,workplace_address,gap_expires,planned_pick,diary_reviewed) VALUES
('B01','River Gala','Apple','Royal Gala',4.5,'12 Demo Road, Hastings',current_date+80,current_date+3,current_date),
('B02','Hill Gala','Apple','Royal Gala',3.2,'12 Demo Road, Hastings',current_date-8,current_date+1,current_date),
('B03','South Sauvignon','Grape','Sauvignon Blanc',6,'18 Demo Road, Hastings',current_date+180,current_date+12,current_date-18),
('B04','East Pear','Pear','Packham',2.4,'12 Demo Road, Hastings',current_date+90,current_date+5,current_date)
ON CONFLICT(code) DO NOTHING;
INSERT INTO workers(code,name,training_expires) VALUES ('W01','Moana Demo',current_date+90),('W02','Alex Demo',current_date-5),('W03','Aroha Demo',current_date+120) ON CONFLICT(code) DO NOTHING;
INSERT INTO sprays(ref,block_id,worker_id,product,applied_at,amount,unit,wind_speed_kmh,wind_direction,boundary_measures,whp_days,rei_hours,label_ref)
SELECT x.ref,b.id,w.id,x.product,current_date+x.days*interval '1 day',x.amount,'L',x.wind,x.direction,'Buffer checked',x.whp,24,x.label FROM
(VALUES ('S01','B01','W01','Demo product A',-2,8,6,'NE',7,'DEMO LABEL ONLY'),('S02','B02','W02','Demo product B',-1,4,5,'W',3,'DEMO LABEL ONLY'),('S03','B03','W01','Demo product C',-20,5,NULL,NULL,NULL,NULL),('S04','B04','W03','Demo product D',-15,3,4,'S',2,'DEMO LABEL ONLY')) AS x(ref,block,worker,product,days,amount,wind,direction,whp,label)
JOIN blocks b ON b.code=x.block JOIN workers w ON w.code=x.worker ON CONFLICT(ref) DO NOTHING;
INSERT INTO harvests(ref,block_id,picked_at,bins,kg,destination,docket,status)
SELECT x.ref,b.id,current_date+x.days*interval '1 day',x.bins,x.kg,x.dest,x.docket,x.status FROM
(VALUES ('H01','B01',-10,18,6300,'Demo Packhouse','D001','recorded'),('H02','B02',0,6,2100,NULL,NULL,'held'),('H03','B04',-3,12,4200,'Demo Packhouse','D003','recorded')) AS x(ref,block,days,bins,kg,dest,docket,status)
JOIN blocks b ON b.code=x.block ON CONFLICT(ref) DO NOTHING;
INSERT INTO labour(ref,block_id,worker_id,worked_on,activity,hours,cost)
SELECT x.ref,b.id,w.id,current_date-3,x.activity,x.hours,x.cost FROM
(VALUES ('L01','B01','W01','Picking',30/4.0,240),('L02','B02','W02','Picking',8,280),('L03','B03','W03','Canopy',7,224),('L04','B04','W03','Picking',6,192)) AS x(ref,block,worker,activity,hours,cost)
JOIN blocks b ON b.code=x.block JOIN workers w ON w.code=x.worker ON CONFLICT(ref) DO NOTHING;
INSERT INTO tasks(ref,block_id,title,due,owner)
SELECT x.ref,b.id,x.title,current_date+x.days,x.owner FROM
(VALUES ('T01','B01','Maturity sample',-2,'Moana'),('T02','B02','Renew GAP evidence',-7,'Alex'),('T03','B03','Check contractor spray diary',-10,'Moana'),('T04','B04','Book bin pickup',2,'Aroha')) AS x(ref,block,title,days,owner)
JOIN blocks b ON b.code=x.block ON CONFLICT(ref) DO NOTHING;
INSERT INTO irrigation(ref,block_id,watered_on,source,litres) SELECT 'I01',id,current_date-2,'Demo bore',18000 FROM blocks WHERE code='B01' ON CONFLICT(ref) DO NOTHING;
