-- WC2026 seed data (generated). Run AFTER 01_schema.sql.
-- Idempotent: re-running is a no-op (ON CONFLICT DO NOTHING).
BEGIN;

-- Teams (48) + TBD placeholder
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_mex', 'MEX', 'Mexico', 'المكسيك', 'A', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_rsa', 'RSA', 'South Africa', 'جنوب أفريقيا', 'A', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_kor', 'KOR', 'South Korea', 'كوريا الجنوبية', 'A', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_cze', 'CZE', 'Czech Republic', 'التشيك', 'A', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_can', 'CAN', 'Canada', 'كندا', 'B', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_bih', 'BIH', 'Bosnia & Herzegovina', 'البوسنة', 'B', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_qat', 'QAT', 'Qatar', 'قطر', 'B', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_sui', 'SUI', 'Switzerland', 'سويسرا', 'B', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_bra', 'BRA', 'Brazil', 'البرازيل', 'C', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_mar', 'MAR', 'Morocco', 'المغرب', 'C', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_hai', 'HAI', 'Haiti', 'هايتي', 'C', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_sco', 'SCO', 'Scotland', 'إسكتلندا', 'C', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_usa', 'USA', 'United States', 'أمريكا', 'D', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_par', 'PAR', 'Paraguay', 'باراغواي', 'D', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_aus', 'AUS', 'Australia', 'أستراليا', 'D', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_tur', 'TUR', 'Turkey', 'تركيا', 'D', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_ger', 'GER', 'Germany', 'ألمانيا', 'E', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_cuw', 'CUW', 'Curaçao', 'كوراساو', 'E', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_civ', 'CIV', 'Ivory Coast', 'ساحل العاج', 'E', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_ecu', 'ECU', 'Ecuador', 'الإكوادور', 'E', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_ned', 'NED', 'Netherlands', 'هولندا', 'F', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_jpn', 'JPN', 'Japan', 'اليابان', 'F', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_swe', 'SWE', 'Sweden', 'السويد', 'F', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_tun', 'TUN', 'Tunisia', 'تونس', 'F', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_bel', 'BEL', 'Belgium', 'بلجيكا', 'G', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_egy', 'EGY', 'Egypt', 'مصر', 'G', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_irn', 'IRN', 'Iran', 'إيران', 'G', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_nzl', 'NZL', 'New Zealand', 'نيوزيلندا', 'G', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_esp', 'ESP', 'Spain', 'إسبانيا', 'H', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_cpv', 'CPV', 'Cape Verde', 'الرأس الأخضر', 'H', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_ksa', 'KSA', 'Saudi Arabia', 'السعودية', 'H', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_uru', 'URU', 'Uruguay', 'أوروغواي', 'H', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_fra', 'FRA', 'France', 'فرنسا', 'I', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_sen', 'SEN', 'Senegal', 'السنغال', 'I', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_irq', 'IRQ', 'Iraq', 'العراق', 'I', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_nor', 'NOR', 'Norway', 'النرويج', 'I', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_arg', 'ARG', 'Argentina', 'الأرجنتين', 'J', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_alg', 'ALG', 'Algeria', 'الجزائر', 'J', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_aut', 'AUT', 'Austria', 'النمسا', 'J', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_jor', 'JOR', 'Jordan', 'الأردن', 'J', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_por', 'POR', 'Portugal', 'البرتغال', 'K', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_cod', 'COD', 'DR Congo', 'الكونغو', 'K', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_uzb', 'UZB', 'Uzbekistan', 'أوزبكستان', 'K', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_col', 'COL', 'Colombia', 'كولومبيا', 'K', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_eng', 'ENG', 'England', 'إنجلترا', 'L', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_cro', 'CRO', 'Croatia', 'كرواتيا', 'L', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_gha', 'GHA', 'Ghana', 'غانا', 'L', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","groupName","createdAt","updatedAt") VALUES ('team_pan', 'PAN', 'Panama', 'بنما', 'L', now(), now()) ON CONFLICT ("code") DO NOTHING;
INSERT INTO "Team" ("id","code","nameEn","nameAr","createdAt","updatedAt") VALUES ('team_tbd', 'TBD', 'TBD', 'يُحدد لاحقًا', now(), now()) ON CONFLICT ("code") DO NOTHING;

-- Bootstrap admin (employeeId 1001)
INSERT INTO "User" ("id","employeeId","name","department","role","isActive","createdAt","updatedAt") VALUES ('usr_admin1001', '1001', 'مدير النظام', 'تقنية المعلومات', 'ADMIN', true, now(), now()) ON CONFLICT ("employeeId") DO NOTHING;

-- Default setting
INSERT INTO "Setting" ("key","value","updatedAt") VALUES ('registration_open','true', now()) ON CONFLICT ("key") DO NOTHING;

-- Sample matches (opening fixtures only — NOT the full 104 schedule)
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_1', 1, 'GROUP'::"Stage", 'team_mex', 'team_rsa', '2026-06-11 19:00:00', 'Mexico City', 'Estadio Azteca', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_2', 2, 'GROUP'::"Stage", 'team_kor', 'team_cze', '2026-06-12 02:00:00', 'Vancouver', 'BC Place', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_3', 3, 'GROUP'::"Stage", 'team_can', 'team_bih', '2026-06-12 19:00:00', 'Toronto', 'BMO Field', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_4', 4, 'GROUP'::"Stage", 'team_usa', 'team_par', '2026-06-13 01:00:00', 'Los Angeles', 'SoFi Stadium', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_5', 5, 'GROUP'::"Stage", 'team_qat', 'team_sui', '2026-06-13 19:00:00', 'Houston', 'NRG Stadium', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_6', 6, 'GROUP'::"Stage", 'team_bra', 'team_mar', '2026-06-13 22:00:00', 'Miami', 'Hard Rock Stadium', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_7', 7, 'GROUP'::"Stage", 'team_sco', 'team_hai', '2026-06-14 01:00:00', 'Atlanta', 'Mercedes-Benz Stadium', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_8', 8, 'GROUP'::"Stage", 'team_tur', 'team_aus', '2026-06-14 04:00:00', 'Seattle', 'Lumen Field', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_9', 9, 'GROUP'::"Stage", 'team_ger', 'team_cuw', '2026-06-14 17:00:00', 'Philadelphia', 'Lincoln Financial Field', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_10', 10, 'GROUP'::"Stage", 'team_ned', 'team_jpn', '2026-06-14 20:00:00', 'New York', 'MetLife Stadium', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;

-- Lock-test fixture: kickoff already in the past (delete after testing).
INSERT INTO "Match" ("id","matchNumber","stage","homeTeamId","awayTeamId","kickoffAt","city","stadium","status","wentToPenalties","createdAt","updatedAt") VALUES ('mtch_101', 101, 'GROUP'::"Stage", 'team_kor', 'team_cze', '2026-06-01 12:00:00', 'Test', 'Lock Test', 'SCHEDULED', false, now(), now()) ON CONFLICT ("matchNumber") DO NOTHING;

COMMIT;
