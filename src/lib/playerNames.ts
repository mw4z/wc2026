// Arabic display names for players with Arabic names (Arab national-team squads).
// ESPN reports Latin names; for Arabic users we show the Arabic spelling when we
// know it, and fall back to the Latin name otherwise (per product rule: only swap
// to Arabic when the player actually has an Arabic name).
//
// Keyed by a normalized Latin name (lowercase, accents stripped, non-letters
// removed) so minor punctuation/diacritic differences from ESPN still match.
// Extend freely as new Arab scorers appear — an unknown name simply stays Latin.

function norm(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "");
}

// Latin (as ESPN spells it) → Arabic. Add entries as needed.
const RAW: Record<string, string> = {
  // Egypt
  "Mohamed Salah": "محمد صلاح",
  "Emam Ashour": "إمام عاشور",
  "Omar Marmoush": "عمر مرموش",
  "Trezeguet": "تريزيجيه",
  "Mahmoud Hassan": "محمود حسن تريزيجيه",
  "Mostafa Mohamed": "مصطفى محمد",
  "Marwan Attia": "مروان عطية",
  "Marawan Attia": "مروان عطية",
  "Mohamed Elneny": "محمد النني",
  "Mahmoud Trezeguet": "محمود تريزيجيه",
  "Mohamed Hany": "محمد هاني",
  "Mohamed Abdelmonem": "محمد عبد المنعم",
  "Mohanad Lasheen": "مهند لاشين",
  "Ahmed Sayed": "أحمد سيد زيزو",
  "Zizo": "زيزو",
  "Ibrahim Adel": "إبراهيم عادل",
  "Mostafa Fathi": "مصطفى فتحي",
  "Ramadan Sobhi": "رمضان صبحي",
  "Ahmed Hassan": "أحمد حسن كوكا",
  "Akram Tawfik": "أكرم توفيق",
  // Saudi Arabia
  "Salem Al-Dawsari": "سالم الدوسري",
  "Salem Aldawsari": "سالم الدوسري",
  "Firas Al-Buraikan": "فراس البريكان",
  "Firas Al Buraikan": "فراس البريكان",
  "Saleh Al-Shehri": "صالح الشهري",
  "Abdullah Al-Hamdan": "عبدالله الحمدان",
  "Mohammed Kanno": "محمد كنو",
  "Sami Al-Najei": "سامي النجعي",
  "Musab Al-Juwayr": "مصعب الجوير",
  // Morocco
  "Hakim Ziyech": "حكيم زياش",
  "Achraf Hakimi": "أشرف حكيمي",
  "Youssef En-Nesyri": "يوسف النصيري",
  "Youssef En Nesyri": "يوسف النصيري",
  "Sofiane Boufal": "سفيان بوفال",
  "Azzedine Ounahi": "عز الدين أوناحي",
  "Brahim Diaz": "إبراهيم دياز",
  "Abde Ezzalzouli": "عبدالصمد الزلزولي",
  "Soufiane Rahimi": "سفيان رحيمي",
  "Ayoub El Kaabi": "أيوب الكعبي",
  // Tunisia
  "Wahbi Khazri": "وهبي الخزري",
  "Youssef Msakni": "يوسف المساكني",
  "Hannibal Mejbri": "هنيبعل المجبري",
  "Issam Jebali": "عصام جبالي",
  // Algeria
  "Riyad Mahrez": "رياض محرز",
  "Islam Slimani": "إسلام سليماني",
  "Baghdad Bounedjah": "بغداد بونجاح",
  "Youcef Belaili": "يوسف بلايلي",
  // Qatar / UAE / Jordan / Iraq
  "Almoez Ali": "المعز علي",
  "Akram Afif": "أكرم عفيف",
  "Ali Mabkhout": "علي مبخوت",
  "Yazan Al-Naimat": "يزن النعيمات",
  "Mousa Al-Taamari": "موسى التعمري",
  "Musa Al-Tamari": "موسى التعمري",
  "Aymen Hussein": "أيمن حسين",
};

const AR_BY_NORM = new Map(Object.entries(RAW).map(([latin, ar]) => [norm(latin), ar]));

/** Arabic name for a Latin scorer, or null if we don't have one. */
export function arabicPlayerName(latin: string): string | null {
  return AR_BY_NORM.get(norm(latin)) ?? null;
}

/** Display name for a locale: Arabic when locale is `ar` and we know one, else Latin. */
export function playerDisplayName(latin: string, locale: string): string {
  if (locale === "ar") return arabicPlayerName(latin) ?? latin;
  return latin;
}
