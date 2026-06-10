-- Award candidate lists, grounded in the 48 QUALIFIED teams for the 2026 World Cup
-- (verified against Wikipedia). Wipes any prior awc_* candidates and reinserts the
-- corrected set, so it's safe whether or not the earlier version was run.
-- Fully editable later in /admin/awards. Run BEFORE the first kickoff (the lock).
--
-- Safe pre-launch: deleting candidates cascade-deletes any test award picks. Do
-- NOT re-run after real members have picked (it would clear their picks).

BEGIN;

DELETE FROM "AwardCandidate" WHERE "id" LIKE 'awc_%';

INSERT INTO "AwardCandidate" ("id","awardId","nameAr","nameEn","team") VALUES
-- Golden Ball (best player)
('awc_gb_01','awd_golden_ball','كيليان مبابي','Kylian Mbappé','France'),
('awc_gb_02','awd_golden_ball','جود بيلينغهام','Jude Bellingham','England'),
('awc_gb_03','awd_golden_ball','فينيسيوس جونيور','Vinícius Júnior','Brazil'),
('awc_gb_04','awd_golden_ball','لامين يامال','Lamine Yamal','Spain'),
('awc_gb_05','awd_golden_ball','ليونيل ميسي','Lionel Messi','Argentina'),
('awc_gb_06','awd_golden_ball','إيرلينغ هالاند','Erling Haaland','Norway'),
('awc_gb_07','awd_golden_ball','هاري كين','Harry Kane','England'),
('awc_gb_08','awd_golden_ball','بيدري','Pedri','Spain'),
('awc_gb_09','awd_golden_ball','كيفن دي بروين','Kevin De Bruyne','Belgium'),
('awc_gb_10','awd_golden_ball','لاوتارو مارتينيز','Lautaro Martínez','Argentina'),
('awc_gb_11','awd_golden_ball','كريستيانو رونالدو','Cristiano Ronaldo','Portugal'),
('awc_gb_12','awd_golden_ball','جمال موسيالا','Jamal Musiala','Germany'),
('awc_gb_13','awd_golden_ball','فلوريان فيرتز','Florian Wirtz','Germany'),
('awc_gb_14','awd_golden_ball','محمد صلاح','Mohamed Salah','Egypt'),
('awc_gb_15','awd_golden_ball','رودري','Rodri','Spain'),
('awc_gb_16','awd_golden_ball','فيدريكو فالفيردي','Federico Valverde','Uruguay'),
-- Golden Boot (top scorer)
('awc_bt_01','awd_golden_boot','كيليان مبابي','Kylian Mbappé','France'),
('awc_bt_02','awd_golden_boot','هاري كين','Harry Kane','England'),
('awc_bt_03','awd_golden_boot','إيرلينغ هالاند','Erling Haaland','Norway'),
('awc_bt_04','awd_golden_boot','فينيسيوس جونيور','Vinícius Júnior','Brazil'),
('awc_bt_05','awd_golden_boot','لاوتارو مارتينيز','Lautaro Martínez','Argentina'),
('awc_bt_06','awd_golden_boot','خوليان ألفاريز','Julián Álvarez','Argentina'),
('awc_bt_07','awd_golden_boot','لامين يامال','Lamine Yamal','Spain'),
('awc_bt_08','awd_golden_boot','ممفيس ديباي','Memphis Depay','Netherlands'),
('awc_bt_09','awd_golden_boot','روميلو لوكاكو','Romelu Lukaku','Belgium'),
('awc_bt_10','awd_golden_boot','كريستيانو رونالدو','Cristiano Ronaldo','Portugal'),
('awc_bt_11','awd_golden_boot','محمد صلاح','Mohamed Salah','Egypt'),
('awc_bt_12','awd_golden_boot','فيكتور يوكيريس','Viktor Gyökeres','Sweden'),
('awc_bt_13','awd_golden_boot','ألكسندر إيزاك','Alexander Isak','Sweden'),
('awc_bt_14','awd_golden_boot','كاي هافيرتس','Kai Havertz','Germany'),
('awc_bt_15','awd_golden_boot','داروين نونيز','Darwin Núñez','Uruguay'),
('awc_bt_16','awd_golden_boot','رافينيا','Raphinha','Brazil'),
-- Golden Glove (best goalkeeper)
('awc_gl_01','awd_golden_glove','تيبو كورتوا','Thibaut Courtois','Belgium'),
('awc_gl_02','awd_golden_glove','أليسون بيكر','Alisson Becker','Brazil'),
('awc_gl_03','awd_golden_glove','إيميليانو مارتينيز','Emiliano Martínez','Argentina'),
('awc_gl_04','awd_golden_glove','مايك ميان','Mike Maignan','France'),
('awc_gl_05','awd_golden_glove','أوناي سيمون','Unai Simón','Spain'),
('awc_gl_06','awd_golden_glove','جوردان بيكفورد','Jordan Pickford','England'),
('awc_gl_07','awd_golden_glove','ياسين بونو','Yassine Bounou','Morocco'),
('awc_gl_08','awd_golden_glove','ديوغو كوستا','Diogo Costa','Portugal'),
('awc_gl_09','awd_golden_glove','إيدرسون','Ederson','Brazil'),
('awc_gl_10','awd_golden_glove','بارت فيربروغن','Bart Verbruggen','Netherlands'),
('awc_gl_11','awd_golden_glove','مارك أندريه تير شتيغن','Marc-André ter Stegen','Germany'),
('awc_gl_12','awd_golden_glove','يان سومر','Yann Sommer','Switzerland'),
('awc_gl_13','awd_golden_glove','دومينيك ليفاكوفيتش','Dominik Livaković','Croatia'),
('awc_gl_14','awd_golden_glove','مات تيرنر','Matt Turner','United States'),
-- Best Young Player (born 2005 or later)
('awc_yp_01','awd_best_young','لامين يامال','Lamine Yamal','Spain'),
('awc_yp_02','awd_best_young','إندريك','Endrick','Brazil'),
('awc_yp_03','awd_best_young','باو كوبارسي','Pau Cubarsí','Spain'),
('awc_yp_04','awd_best_young','كوبي ماينو','Kobbie Mainoo','England'),
('awc_yp_05','awd_best_young','وارن زائير إيمري','Warren Zaïre-Emery','France'),
('awc_yp_06','awd_best_young','ديزيريه دوي','Désiré Doué','France'),
('awc_yp_07','awd_best_young','إستيفاو','Estêvão','Brazil'),
('awc_yp_08','awd_best_young','فرانكو ماستانتوونو','Franco Mastantuono','Argentina'),
('awc_yp_09','awd_best_young','ماتيس تيل','Mathys Tel','France'),
('awc_yp_10','awd_best_young','كنان يلدز','Kenan Yıldız','Turkey'),
('awc_yp_11','awd_best_young','أردا غولر','Arda Güler','Turkey'),
('awc_yp_12','awd_best_young','لوكاس بيرغفال','Lucas Bergvall','Sweden')
ON CONFLICT ("id") DO NOTHING;

COMMIT;
