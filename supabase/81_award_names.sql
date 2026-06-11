-- Cleaner award labels (dash form). Arabic per UX polish; English aligned to match.
UPDATE "Award" SET "nameAr" = 'الكرة الذهبية — أفضل لاعب',  "nameEn" = 'Golden Ball — Best Player'      WHERE "key" = 'golden_ball';
UPDATE "Award" SET "nameAr" = 'الحذاء الذهبي — الهدّاف',    "nameEn" = 'Golden Boot — Top Scorer'       WHERE "key" = 'golden_boot';
UPDATE "Award" SET "nameAr" = 'القفاز الذهبي — أفضل حارس',  "nameEn" = 'Golden Glove — Best Goalkeeper' WHERE "key" = 'golden_glove';
