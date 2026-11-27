# Translation notes

The site's interface is translated into 13 languages besides English. The strings live in `src/i18n/locales/<code>.json`, with `en.json` as the source. Each language was translated from that file with one glossary per language, which is kept below. Every string a translator was not confident about is listed under its language with the reason, so a native reviewer can start there.

`npm run i18n:check` compares every locale with `en.json`. It checks for missing and extra keys, empty values and changed `{{placeholders}}` or `<tags>`. A missing key falls back to English at runtime; a raw key is never shown.

## Not translated, on purpose

- **API content**:
  - mantra and shloka text, Sanskrit and transliteration
  - mantra, book and chapter titles
  - deity and category names
  - book text and its English rendering
  - audio titles
  - astrology output, such as sign and nakshatra names returned by the calculator
- **Astrology capability names**, such as "Planetary Positions API" on `/astrology-api/<slug>`. They come from the API's published operation catalog. The words around them are translated.
- **Code**: code samples, curl requests, example responses, field and parameter names, endpoint paths, enum values and ids. Comments in code samples are in English too; the samples are shared with the developer console.
- **Mantrilo and Satyam**, and the terms API, JSON, REST, endpoint, API key, SDK, IAST, UTC and HTTP. These stay in Latin script inside translated sentences.
- **Plan names** Starter, Growth and Business. "Free" is translated.
- **The blog** (served live by the blog server) and **the developer console** are not part of this site export and stay in English.

## Decisions that apply to every language

- **Numbers use Latin digits (0–9) in every language**, for example "1,00,000" in Hindi. That matches the digits in code samples and API values next to them. Grouping, currency symbols and month names follow each language. The switch is `intlLocale()` in `src/i18n/locales.ts` if native digits are preferred for Marathi, Nepali, Bengali or Assamese.
- **The mantra and book catalog pages** (about 609) have one English URL each. The interface around the content switches to the visitor's language after the page loads. Every other page has a `/<code>/…` URL and hreflang links.
- **The home headline** is one string, `home.hero.heading`, with `<accent>` and `<br/>`. Every language puts "for developers" first, as its grammar wants.
- **`plans.requestsPerMonthPrefix`** is empty in English. Most languages fill it in ("हर महीने ", for example) because "per month" comes before the number.
- **"Books API"** is translated like the other product names, for example पुस्तक API. Hindi, Gujarati and Malayalam had left it in English; that was changed afterwards for consistency.
- **The Satyam customer quote** is translated in every language. Satyam may want to approve the translations or keep the quote in English.

## Where a native reviewer should look first

These came up in several languages:
- **Rising sign and Lagna** are the same word in most of these languages. Translators chose different words to keep the calculator FAQ ("Is the Rising sign the same as the Lagna?") meaningful.
- **Rashi and zodiac sign** are also often one word. The Zodiac sign and Rashi calculators were given distinct labels.
- **Verse and shloka**, and **chapter and adhyaya**, are one word in most languages.
- **Western-only techniques have no settled native terms**: synastry, progressions, profections, solar return and astrocartography. They are mostly transliterated.
- **Brand lines lose their wordplay**: the footer tagline, the features heading and the "daily practice" in the Satyam quote.


## Hindi (hi) translation notes

### Glossary

| English | Hindi |
|---|---|
| sandbox | सैंडबॉक्स |
| live key | लाइव key |
| API key / key | API key / key (Latin) |
| request | रिक्वेस्ट |
| response | रिस्पॉन्स |
| plan | प्लान |
| Free (plan) | मुफ़्त |
| monthly requests | मासिक रिक्वेस्ट / हर महीने … रिक्वेस्ट |
| allowance / quota | कोटा |
| limit (rate limit) | सीमा (रेट लिमिट) |
| recording | रिकॉर्डिंग |
| signed link | signed लिंक |
| verse / shloka | श्लोक |
| mantra | मंत्र |
| stotra | स्तोत्र |
| hymn | स्तुति |
| chapter / adhyaya | अध्याय |
| book | पुस्तक |
| scripture | शास्त्र / शास्त्र ग्रंथ |
| retelling | पुनर्कथा |
| collection | संग्रह |
| catalog | कैटलॉग |
| library | लाइब्रेरी |
| guide | गाइड |
| integration / integrate | इंटीग्रेशन / इंटीग्रेट करें |
| calculation | गणना |
| capability | क्षमता |
| operation | ऑपरेशन |
| birth chart / natal chart / Kundli | जन्म कुंडली / कुंडली |
| chart (generic) | कुंडली |
| deity | देवता |
| Sanskrit | संस्कृत |
| Devanagari | देवनागरी |
| transliteration | लिप्यंतरण |
| translation | अनुवाद |
| preview | प्रीव्यू |
| field | फ़ील्ड |
| null | null (Latin) |
| documentation / docs | दस्तावेज़ |
| pricing | कीमतें |
| Panchang / tithi / nakshatra / yoga / karana | पंचांग / तिथि / नक्षत्र / योग / करण |
| rashi / lagna / pada | राशि / लग्न / पाद |
| ascendant | लग्न |
| Rising sign (Western) | उदय राशि |
| Sun sign / Moon sign | सूर्य राशि / चंद्र राशि |
| sidereal / tropical | निरयण / सायन |
| ayanamsa | अयनांश |
| Dasha / Vimshottari | दशा / विंशोत्तरी |
| transit / Gochar | गोचर |
| house | भाव |
| aspect (Western) | दृष्टि |
| Western / Vedic | पाश्चात्य / वैदिक |
| Lahiri | लाहिड़ी |
| horoscope / Rashifal | राशिफल; forecast = भविष्यफल |
| Muhurat | मुहूर्त |

### Uncertain strings

1. `meta./calculators/rising-sign.*`, `calc.rising`, `calculators.pages.rising-sign.*`, `guides.astrology-western-rising-sign.*`: "Rising sign" → उदय राशि. Hindi astrology media often say "लग्न राशि", but the site contrasts Rising sign with Lagna ("Is the Rising sign the same as the Lagna?"), so I used उदय राशि to keep the two distinct.
2. `meta./calculators/zodiac-signs.title` / `.label`: "Zodiac sign calculator" → राशिचक्र कैलकुलेटर. "राशि कैलकुलेटर" was already used for the Rashi calculator; the two needed different labels.
3. `calculators.pages.rashi.faqs.a0`: "Mesha (Aries), Vrishabha (Taurus)…" → "मेष (Aries), वृषभ (Taurus)…". In Hindi the Western and Vedic sign names are the same words, so I kept the English names in Latin in the parentheses. You could drop them.
4. `calculators.pages.sun-sign.about.p1`, `zodiac-signs.faqs.a0`: "a Western Gemini but a Vedic Taurus" → "पाश्चात्य पद्धति में मिथुन लेकिन वैदिक पद्धति में वृषभ". In Hindi the same sign names serve both systems, so the contrast rests on the words पाश्चात्य/वैदिक.
5. `calculators.pages.moon-sign.faqs.q0`: "Is the Moon sign the same as the Rashi?" → "क्या चंद्र राशि और राशि एक ही हैं?". In Hindi, राशि also just means "sign", so the question reads a bit oddly.
6. `calculators.pages.zodiac-signs.faqs.a1`: "Moon sign (Rashi)" → "चंद्र राशि (राशि)". The same overlap.
7. `guides.common.oneRequest`: "Failed calculations are refunded" → "विफल गणनाओं की रिक्वेस्ट वापस कर दी जाती है". I read "refunded" as the request being credited back to usage.
8. `home.features.title`: "Built for reading, listening and reckoning time." → "पढ़ने, सुनने और काल-गणना के लिए बना।". "Reckoning time" became काल-गणना (calendar and astrology reckoning).
9. `footer.tagline`: "Sacred content, thoughtfully connected." → "पवित्र कंटेंट, सोच-समझकर जोड़ा गया।". A brand line; the Hindi is plain and loses some polish.
10. `home.story.role`: "Head of Satyam" → "Satyam प्रमुख". This is a job title, which may need the real person's preferred Hindi wording.
11. `home.story.quote`: "daily practice" → "दैनिक साधना". A devotional reading; it could also be "रोज़ का अभ्यास".
12. `plans.requestsPerMonthPrefix` / `plans.requestsPerMonth`: the English prefix is empty. In Hindi I set the prefix to "हर महीने " (with a trailing space) and the suffix to "रिक्वेस्ट", so the rendered line reads "हर महीने <b>N</b> रिक्वेस्ट". The check rejects an empty value, and in `Plans.web.tsx` the prefix sits right before the `<strong>` number.
13. `mantraPage.recordingLower`, `mantraPage.next`, `shelf.nullNote`: short fragments joined in code, translated without seeing the surrounding layout (रिकॉर्डिंग, अगला, "आपका ऐप अपना अनुवाद दिखाता है, या कोई नहीं।").
14. `bookPage.readFirst` / `bookPage.every` / `bookPage.all`: built from `books.term` / `termPlural`. Chapter and Adhyaya both become अध्याय, and most Hindi plurals equal the singular, so "सभी अध्याय" and "सभी खण्ड" read fine. Only वल्ली → वल्लियाँ changes.
15. `books.terms.Question_*`: "question" → प्रश्न (as in Prashna Upanishad). Correct for that text, but literal if the term is used elsewhere.
16. `calc.modes`: Cardinal/Fixed/Mutable → चर/स्थिर/द्विस्वभाव. These are the Vedic terms, used here for the Western modalities.
17. `calc.planets.Jupiter`: गुरु (not बृहस्पति). Both are common.
18. `bookPage.source`, `bookPage.api.fields`: "English rendering by Mantrilo" → "अंग्रेज़ी अनुवाद Mantrilo का". I used अनुवाद for "rendering", which also translates "translation"; the context makes the meaning clear.
19. `guides.astrology-western-profections.render`: "time lord" → "वर्ष का स्वामी (time lord)". There is no standard Hindi term.
20. `guides.astrology-western-*` (profections, primary directions, progressions, solar return, synastry, astrocartography, parans, composite): Western techniques with no established Hindi names are transliterated (प्रोफ़ेक्शन, प्राइमरी डायरेक्शन, प्रोग्रेशन, सोलर रिटर्न, सिनैस्ट्री, कंपोज़िट).
21. `guides.astrology-western-midheaven-sign.*`: Midheaven → मध्याकाश (Midheaven), with the English kept once for clarity.
22. `docs.nav.endpoints`, `docs.env.environment`, `docs.errors.status`, `plans.rows.keys`: kept in Latin as Endpoints / Environment / Status / Keys, following the rule that keeps "endpoint" and "API key" in Latin. "Environment" and "Status" could be translated (एनवायरनमेंट / स्थिति) if you prefer.
23. `home.hero.freeCalls_*`, `home.faq.sandboxA_*` and other `_one`/`_other` pairs: the two forms are identical in Hindi except where the noun inflects.

### Merge check

`node merge-locale.mjs hi` reported: `hi: 1269 keys, ok`.

## Nepali (ne) translation notes

Standard Nepali as written in Nepal (तपाईं register, polite imperative "-नुहोस्", Nepali postpositions मा/लाई/बाट/को/का लागि, Nepali spellings such as मन्त्र, पञ्चाङ्ग, सङ्ग्रह, अङ्ग्रेजी rather than Hindi मंत्र/पंचांग/संग्रह). Developer words use the loanwords Nepali developers say (रिक्वेस्ट, रेस्पोन्स, सर्भर, एप, लिङ्क, क्यास). Terms in rule 4 stay in Latin script.

### 1. Glossary

| English | Nepali |
|---|---|
| sandbox | sandbox (kept in Latin; reads as the product term) |
| live key | लाइभ key |
| sandbox key | sandbox key |
| API key | API key |
| request | रिक्वेस्ट |
| response | रेस्पोन्स |
| call (API call) | कल |
| plan | प्लान |
| Free (plan) | निःशुल्क |
| paid | सशुल्क |
| monthly requests | मासिक रिक्वेस्ट |
| quota / allowance | कोटा |
| rate limit | दर सीमा |
| usage | प्रयोग |
| recording | रेकर्डिङ |
| audio | अडियो |
| signed link | signed लिङ्क |
| preview | प्रिभ्यु |
| verse | श्लोक |
| shloka | श्लोक |
| mantra | मन्त्र |
| stotra / hymn | स्तोत्र |
| chapter | अध्याय |
| collection | सङ्ग्रह |
| book | पुस्तक |
| scripture | धर्मग्रन्थ |
| retelling | पुनर्कथन |
| catalog | क्याटलग |
| library | लाइब्रेरी |
| guide | गाइड |
| integration / integrate | इन्टिग्रेसन / इन्टिग्रेट गर्नु |
| documentation / docs | डकुमेन्टेसन |
| reference | सन्दर्भ |
| calculation | गणना |
| capability | क्षमता |
| operation | operation (kept in Latin; it is the API's field name) |
| field | फिल्ड |
| parameter | प्यारामिटर |
| null | null |
| pagination / page through | पेजिनेसन / पेजअनुसार हेर्नु |
| default | पूर्वनिर्धारित |
| optional | ऐच्छिक |
| birth chart / Kundli | जन्मकुण्डली / कुण्डली |
| deity | देवता |
| transliteration | लिप्यन्तरण |
| Sanskrit / Devanagari | संस्कृत / देवनागरी |
| Panchang | पञ्चाङ्ग |
| tithi, nakshatra, yoga, karana | तिथि, नक्षत्र, योग, करण |
| rashi / lagna / pada | राशि / लग्न / पाद |
| dasha / Vimshottari | दशा / विंशोत्तरी |
| ayanamsa | अयनांश |
| sidereal / tropical | निरयन / सायन |
| transit (Gochar) | गोचर |
| Sun / Moon / Rising sign | सूर्य राशि / चन्द्र राशि / लग्न राशि |
| matching (Guna Milan) | गुण मिलान |
| time zone | समय क्षेत्र |
| latitude / longitude | अक्षांश / देशान्तर |
| calendar (Hindu calendar) | पात्रो |
| Western / Vedic | पश्चिमी / वैदिक |
| error | त्रुटि |
| customer product | ग्राहक उत्पादन |

### 2. Uncertain strings

| Key | English | Nepali | Reason |
|---|---|---|---|
| (global) verse vs shloka | verse / shloka | श्लोक / श्लोक | Nepali has no separate everyday word for "verse" in scripture; both map to श्लोक, so "mantras and shlokas" and "verses" share a term. पद was considered but reads as poetry/lyric. |
| (global) request | request | रिक्वेस्ट | Chose the loanword developers use over the formal अनुरोध; a reviewer may prefer अनुरोध on marketing pages. |
| (global) sandbox | sandbox | sandbox (Latin) | Kept in Latin as a product term; could be transliterated स्यान्डबक्स. |
| (global) operation | operation | operation (Latin) | Kept in Latin because it is the request field name; in prose it might read better as अपरेसन. |
| (global) capability | capability | क्षमता | सुविधा ("feature") is also plausible; क्षमता is more literal. |
| books.term.Chapter / Adhyaya | Chapter / Adhyaya | अध्याय / अध्याय | Both render identically in Nepali, so the distinction the English makes is lost. |
| guides.upanishads.inputs and others | Isha Upanishad | ईशावास्य उपनिषद् | Nepali usage varies between ईश, ईशावास्य and ईशोपनिषद्; collection blurb uses ईश in a list. |
| calculators.pages.rashi.faqs.a0 | Mesha (Aries), Vrishabha (Taurus)… | मेष, वृष, मिथुन… | In Nepali the Sanskrit and Western names are the same words, so the English glosses were dropped. |
| calculators.pages.zodiac-signs.about.p0 | Vedic (Jyotish) astrology | वैदिक (ज्योतिष) पद्धतिले | "Jyotish" and "astrology" are the same word in Nepali, so the parenthesis is near-redundant. |
| calc.rising / meta rising-sign | Rising sign | लग्न राशि | Nepali uses लग्न for both Western Rising sign and Vedic Lagna, so pages that contrast them (e.g. calculators.pages.rising-sign.faqs.a1) read slightly circular; "ascendant" kept in Latin in a few places to disambiguate. |
| calc.ascendant | Ascendant | Ascendant | Left in Latin because लग्न is already used for Lagna and Rising sign on the same card. |
| calc.modes.Mutable | Mutable | द्विस्वभाव | Traditional term; some Western-astrology texts use परिवर्तनशील. |
| calc.placePlaceholder | Start typing a city, e.g. Kathmandu | …जस्तै Kathmandu | Kept the city in Latin on the assumption the place search matches Latin names; change to काठमाडौं if search supports Devanagari. |
| plans.requestsPerMonthPrefix / requestsPerMonth | "" / requests / month | "मासिक " / रिक्वेस्ट | English prefix is empty but the check rejects empty values; split as "मासिक <n> रिक्वेस्ट". Prefix has a trailing space because the JSX puts no space before the number. |
| plans.forever | forever | सधैँका लागि | Follows the "$0" price; reads acceptably but a little literal. |
| plans.customQuote | Custom quote | अनुकूलित मूल्य | Could also be "विशेष मूल्य प्रस्ताव". |
| footer.tagline | Sacred content, thoughtfully connected. | पवित्र सामग्री, सोचविचार गरी जोडिएको। | Brand line; the nuance of "thoughtfully" doesn't carry over cleanly. |
| home.features.title | Built for reading, listening and reckoning time. | पढ्न, सुन्न र समय गणना गर्नका लागि बनाइएको। | "Reckoning time" (calendar/astrology) flattened to "calculating time". |
| home.story.quote | Customer quote from Head of Satyam | translated quote | Translating a customer's quote; the site owner may prefer to keep it in English or have Satyam approve the wording. |
| home.story.role | Head of Satyam | Satyam प्रमुख | Job title wording. |
| info.privacy.referral | broad referral category… | रेफरलको मोटामोटी वर्ग… | Technical/legal sentence; meaning preserved but phrasing is dense. |
| astroCap.daily2 | November 15, 2026 | नोभेम्बर 15, 2026 | Gregorian date kept; Nepali readers might expect Bikram Sambat, but the example data is Gregorian. |
| mantraPage.ledeCollection_one/_other | {{title}} is in the {{deities}} collection(s). | {{title}} {{deities}} सङ्ग्रह(हरू)मा छ। | Reads well only if {{deities}} is a name list; postposition attachment to placeholders kept separated for mixed-script safety. |
| mantraPage.yes / no | Yes / No | छ / छैन | Assumed these answer "has a recording?"; if used for other yes/no cells, हो / होइन may fit better. |
| guides.astrology-positions.inputs | approximate sidereal offset | अनुमानित सायन-निरयन अन्तर | Rendered as "tropical–sidereal difference" to be clear; a purist might just write अयनांश. |
| guides.astrology-western-profections.render | time lord | समयको स्वामी (time lord) | No settled Nepali term for this Hellenistic concept. |
| guides.astrology-western-* (several) | profection, primary directions, progressions, Solar return, synastry, composite | प्रोफेक्सन, प्राइमरी डाइरेक्सन, प्रोग्रेसन, सोलार रिटर्न, सिनास्ट्री, कम्पोजिट | Western-only techniques with no standard Nepali names; transliterated. |
| guides.astrology-vedic-muhurat.summary | auspicious timing | शुभ साइत | Used colloquial Nepali साइत here and मुहूर्त for "Muhurat windows"; both are correct, mixed deliberately. |
| docs.nav.endpoints / astroPage.stats.endpoint | Endpoints / Endpoint | Endpoints / Endpoint | Kept in Latin per rule 4; looks English in navigation. |
| meta./calculators/rashi.title vs /calculators/zodiac-signs.label | Rashi calculator / Zodiac sign calculator | राशि क्याल्कुलेटर (both) | Nepali राशि covers both "zodiac sign" and "Rashi", so two pages share the same label. |

### 3. Check

`node merge-locale.mjs ne` reported: `ne: 1269 keys, ok`.

## Marathi (mr) translation notes

### Glossary

| English | Marathi |
|---|---|
| sandbox | सँडबॉक्स |
| live key | लाइव्ह key |
| sandbox key | सँडबॉक्स key |
| API key | API key (Latin, feminine: "ती") |
| request | रिक्वेस्ट |
| response | रिस्पॉन्स |
| plan | प्लॅन |
| monthly requests | मासिक रिक्वेस्ट / दरमहा रिक्वेस्ट |
| Free (plan) | मोफत |
| paid | सशुल्क |
| quota / allowance | कोटा |
| limit | मर्यादा (rate limit: रेट लिमिट) |
| recording | रेकॉर्डिंग |
| signed link / URL | साइन केलेली लिंक / URL |
| placeholder | प्लेसहोल्डर |
| verse | श्लोक |
| shloka | श्लोक |
| mantra | मंत्र |
| stotra / hymn | स्तोत्र |
| chapter | अध्याय |
| chapter index | अध्याय अनुक्रमणिका |
| book | ग्रंथ |
| scripture | धर्मग्रंथ |
| retelling | पुनर्कथन |
| collection | संग्रह |
| catalog | कॅटलॉग |
| library | लायब्ररी |
| guide | मार्गदर्शिका |
| documentation / docs | दस्तऐवजीकरण / डॉक्स |
| integration / integrate | इंटिग्रेशन / इंटिग्रेट करा |
| calculation | गणना |
| capability | क्षमता |
| operation | ऑपरेशन |
| field | फील्ड |
| null | null (Latin) |
| preview | प्रिव्ह्यू |
| deity | देवता |
| Sanskrit / Devanagari | संस्कृत / देवनागरी |
| transliteration | लिप्यंतर |
| translation | भाषांतर (English rendering on site: इंग्रजी अनुवाद) |
| source reference | स्रोत संदर्भ |
| birth chart / Kundli | जन्मकुंडली / कुंडली |
| chart (generic) | कुंडली |
| zodiac sign (generic) | राशी |
| Rashi (Vedic Moon sign) | रास |
| Rising sign | लग्न राशी |
| Lagna | लग्न |
| Nakshatra / pada | नक्षत्र / चरण |
| Panchang / tithi / karana | पंचांग / तिथी / करण |
| Dasha / Vimshottari | दशा / विंशोत्तरी |
| ayanamsa | अयनांश |
| sidereal / tropical | निरयन / सायन |
| transit / Gochar | गोचर |
| house | भाव (Lagna pages: स्थान) |
| aspect | दृष्टी |
| matching / Guna Milan | गुणमिलन |
| horoscope / forecast | राशीभविष्य / भविष्य |
| Upanishad(s) | उपनिषद / उपनिषदे |
| Isha Upanishad | ईशावास्य उपनिषद |
| pagination | पेजिनेशन |
| server / backend / cache | सर्व्हर / बॅकएंड / कॅशे |

### Uncertain strings

| Key | English | Marathi | Reason |
|---|---|---|---|
| home.hero.title + titleAccent | Hindu content API / for developers. | हिंदू कंटेंट API / डेव्हलपर्ससाठी. | Two spans keep English order; Marathi would normally put "डेव्हलपर्ससाठी" first. Reads fine as a headline but is inverted. |
| meta./.title (and other "Hindu Content API") | Hindu Content API | हिंदू कंटेंट API | "कंटेंट" loanword chosen over formal "आशय"/"साहित्य"; competing conventions. |
| calculators.pages.rising-sign.* / calc.rising | Rising sign | लग्न राशी | Marathi uses लग्न for both the Western rising sign and the Vedic Lagna; I used "लग्न राशी" for Western and "लग्न" for Vedic, with "(Ascendant)" in Latin in two places to disambiguate. |
| calc.ascendant | Ascendant | Ascendant | Kept in Latin because "लग्न" is already taken by calc.lagna on the same screen. A native alternative would be "उदित राशी", which is rarely used. |
| calculators.pages.rashi.* / calc.rashi / astro.rashi | Rashi | रास | Marathi "रास" is natural for one's own Rashi, but generic "zodiac sign" is "राशी". The two forms may look inconsistent to some readers. |
| meta./calculators/rashi.label | Rashi calculator | रास कॅल्क्युलेटर | Chosen so it doesn't match "राशी कॅल्क्युलेटर" (zodiac-signs). |
| calculators.pages.rashi.faqs.a0 | Mesha (Aries), … | मेष (Aries), … | Marathi names for Vedic and Western signs are the same, so the English names stay in brackets for clarity. |
| calculators.pages.zodiac-signs.faqs.a0 | 10° Gemini … 16° Taurus | 10° मिथुनमध्ये … 16° वृषभमध्ये | Used Marathi sign names for Western signs; the meaning is right, but the Western/Vedic contrast depends on context. |
| calc.modes.Mutable | Mutable | द्विस्वभाव | Traditional Indian term. Western-astrology readers may expect "परिवर्तनशील". |
| calc.placePlaceholder | Start typing a city, e.g. Kathmandu | शहराचे नाव टाइप करायला सुरुवात करा, उदा. Pune | Example city changed to Pune and kept in Latin, because I don't know whether place search accepts Devanagari input. Revert to Kathmandu if the example must match. |
| mantraHub.all.sorted | Sorted A to Z | वर्णक्रमानुसार | I don't know which script the list is sorted in, so I used the neutral "alphabetically". |
| plans.requestsPerMonthPrefix / requestsPerMonth | "" / requests / month | "दरमहा " / रिक्वेस्ट | English prefix is empty. I used the prefix slot for Marathi word order: "दरमहा **N** रिक्वेस्ट". The prefix has a trailing space. |
| guides.astrology-chart.render | divisions, ascendant, planets and houses | वर्ग, लग्न, ग्रह आणि भाव | Unclear whether these are field names inside data.charts. I translated them as concepts. |
| guides.astrology-panchang.render, astrology-daily-panchang.render | tithi, nakshatra, yoga, karana, sunrise… | kept in Latin | Treated as field names after data.panchang./data.; if they are ordinary words they should be Devanagari. |
| guides.*.inputs (latitude/longitude, birth, divisions, layout, query) | latitude/longitude… | kept in Latin | Treated as request parameter names. |
| guides.search-mantras.inputs | The Mantras route also serves shlokas. | मंत्रांचा रूट श्लोकही देतो. | "route" is ambiguous (endpoint vs. app route). |
| guides.astrology-positions.inputs | approximate sidereal offset | अंदाजे सायन-निरयन फरक | Rendered as the tropical-sidereal difference (= ayanamsa). It's technically accurate but wordier than the English. |
| guides.common.oneRequest | Failed calculations are refunded. | अयशस्वी गणनांसाठी वापरलेली रिक्वेस्ट परत जमा होते. | Interpreted "refunded" as the request credited back to the quota, not money. |
| bookPage.readFirst / every / all | Read {{term}} {{n}} / Every {{term}} page / All {{terms}} | {{term}} {{n}} वाचा / प्रत्येक {{term}} पानावर / सर्व {{terms}} | These depend on books.term values. Marathi plurals equal singulars, so "सर्व अध्याय" works, but case endings can't attach to the variable. |
| books.term.Pada | Pada | पाद | Book-division "pada" (Brahma/Yoga Sutras) is पाद. The nakshatra quarter is चरण elsewhere. |
| books.term.Chapter / Adhyaya | Chapter / Adhyaya | अध्याय / अध्याय | Both map to the same Marathi word. |
| mantraPage.ledeIds | It is filed under {{n}} ids. | हे {{n}} id अंतर्गत नोंदवलेले आहे. | Neuter "हे" used because the gender of the mantra title is unknown. |
| mantraPage.ledeCollection_* | {{title}} is in the {{deities}} collection. | {{title}} {{deities}} संग्रहात आहे. | Depends on {{deities}} being a joined name list. Fine for one name; slightly stiff for several. |
| shelf.nullNote | your app shows its own translation, or none. | तुमचे ॲप स्वतःचे भाषांतर दाखवते, किंवा काहीच नाही. | Fragment whose surrounding UI I couldn't see. |
| footer.tagline | Sacred content, thoughtfully connected. | पवित्र कंटेंट, विचारपूर्वक जोडलेला. | Brand line; the English rhythm doesn't fully carry over. |
| home.features.title | Built for reading, listening and reckoning time. | वाचन, श्रवण आणि कालगणनेसाठी तयार केलेले. | "reckoning time" rendered as कालगणना (time-reckoning). |
| info.contact.astrologyTitle | Plan an astrology inquiry. | ज्योतिषविषयक चौकशीची तयारी करा. | "Plan" here read as "prepare". |
| plans.customQuote / requestQuote | Custom quote / Request a quote | स्वतंत्र दरपत्रक / दरपत्रक मागवा | "दरपत्रक" is the formal word. Some readers may prefer "कोटेशन". |
| calculators.pages.rising-sign.about.p0 | faster or slower depending on your latitude | तुमच्या अक्षांशानुसार ती लवकर किंवा उशिरा बदलते | Smoothed slightly for natural Marathi. |

### Merge check

`node merge-locale.mjs mr` reported: `mr: 1269 keys, ok`.

## Gujarati (gu) translation notes

### Glossary

| English | Gujarati |
|---|---|
| sandbox | સેન્ડબોક્સ |
| live key / sandbox key | લાઇવ key / સેન્ડબોક્સ key ("key" kept in Latin, like "API key") |
| request | રિક્વેસ્ટ |
| response | રિસ્પોન્સ |
| call (API call) | કૉલ |
| plan | પ્લાન |
| Free (plan) | મફત |
| monthly requests | માસિક રિક્વેસ્ટ / દર મહિને … રિક્વેસ્ટ |
| quota / allowance | ક્વોટા |
| limit / rate limit | મર્યાદા / રેટ લિમિટ |
| usage | વપરાશ |
| recording | રેકોર્ડિંગ |
| verse / shloka | શ્લોક |
| chapter (and Adhyaya) | અધ્યાય |
| collection | સંગ્રહ |
| catalog | કેટલૉગ |
| library | લાઇબ્રેરી |
| book | પુસ્તક (ગ્રંથ for "scripture/text" in prose) |
| retelling | પુનઃકથન |
| guide | માર્ગદર્શિકા |
| integration / integrate | ઇન્ટિગ્રેશન / ઇન્ટિગ્રેટ કરો |
| calculation | ગણતરી |
| capability | ક્ષમતા |
| operation | operation (kept as the API's own term) |
| birth chart / natal chart / Kundli | જન્મ કુંડળી / કુંડળી |
| chart (generic, Western image) | ચાર્ટ |
| deity | દેવતા |
| Sanskrit / Devanagari | સંસ્કૃત / દેવનાગરી |
| transliteration | લિપ્યંતર |
| translation | અનુવાદ |
| preview | પ્રિવ્યૂ |
| field | ફીલ્ડ |
| null | null |
| signed link | signed લિંક |
| page (pagination) / pagination | પેજ / પેજિનેશન |
| server / backend / cache | સર્વર / બૅકએન્ડ / કૅશ |
| app | ઍપ |
| content | કન્ટેન્ટ |
| source reference | સ્રોત સંદર્ભ |
| Panchang / tithi / nakshatra / yoga / karana | પંચાંગ / તિથિ / નક્ષત્ર / યોગ / કરણ |
| rashi / Sun sign / Moon sign | રાશિ / સૂર્ય રાશિ / ચંદ્ર રાશિ |
| Rising sign (Western) / ascendant | ઉદય રાશિ / ઍસેન્ડન્ટ |
| Lagna | લગ્ન |
| Dasha / Vimshottari | દશા / વિંશોત્તરી |
| ayanamsa / sidereal / tropical | અયનાંશ / નિરયન / સાયન |
| transit / Gochar | ગોચર |
| house / aspect | ભાવ / દૃષ્ટિ |
| Muhurat / Rashifal / Rahu Kalam | મુહૂર્ત / રાશિફળ / રાહુકાળ |
| matching / Guna Milan | મેળાપ / ગુણ મેળાપ |
| Vedic / Western | વૈદિક / પશ્ચિમી |
| Upanishad / Bhagavad Gita | ઉપનિષદ / ભગવદ્ ગીતા |
| Ramayana / Mahabharata / epic | રામાયણ / મહાભારત / મહાકાવ્ય |
| mantra / stotra / hymn | મંત્ર / સ્તોત્ર / સ્તોત્ર |
| forecast / horoscope | ભવિષ્યકથન / રાશિફળ |

### Uncertain strings

1. `home.hero.title` + `home.hero.titleAccent`: "Hindu content API" / "for developers." → "હિંદુ કન્ટેન્ટ API" / "ડેવલપર્સ માટે." The two halves render in English order. Natural Gujarati would put "ડેવલપર્સ માટે" first, so the headline reads slightly inverted. It is acceptable for a headline, but a native reviewer may prefer swapping the halves in code.
2. `calculators.pages.*`, `calc.rising`, `meta./calculators/rising-sign.*`: "Rising sign" → "ઉદય રાશિ". In Gujarati the ascendant is usually just "લગ્ન", which is also the term for Lagna. I used ઉદય રાશિ for the Western rising sign so that "Is the Rising sign the same as the Lagna?" still makes sense. ઉદય રાશિ is understood but less common.
3. `calc.ascendant`, `calc.vedicAscendant`: "Ascendant" → "ઍસેન્ડન્ટ" (loanword). These need to stay separate from "લગ્ન" (`calc.lagna`) on the same card. A purist might prefer "લગ્ન બિંદુ".
4. `meta./calculators/zodiac-signs.label` and `.title`: "Zodiac sign calculator" → "રાશિચક્ર કેલ્ક્યુલેટર". "રાશિ કેલ્ક્યુલેટર" would clash with the Rashi calculator's label, so I used રાશિચક્ર ("zodiac"), which is slightly less literal.
5. `calculators.pages.moon-sign.faqs.q0`: "Is the Moon sign the same as the Rashi?" → "શું ચંદ્ર રાશિ અને રાશિ એક જ છે?" In Gujarati "રાશિ" already means both "sign" and "Rashi", so the question sounds a bit circular.
6. `calculators.pages.rashi.faqs.a0`: the English list "Mesha (Aries), …" became just "મેષ, વૃષભ, …". The Sanskrit and Gujarati names are the same, so the English glosses were dropped.
7. `calc.placePlaceholder`: "e.g. Kathmandu" kept in Latin script ("દા.ત. Kathmandu"). The place search probably expects Latin input. Another option is a Gujarati city such as અમદાવાદ.
8. `docs.env.label`, `docs.env.environment`: "Key environments" / "Environment" → "key environments" / "Environment", left mostly in English. A Gujarati word (પર્યાવરણ) would read as "natural environment". "એન્વાયર્નમેન્ટ" is another option.
9. `plans.requestsPerMonthPrefix` / `plans.requestsPerMonth`: changed the word order to "દર મહિને <n> રિક્વેસ્ટ". The prefix (empty in English) is now "દર મહિને " with a trailing space, because the JSX places it directly before `<strong>`. Please check the spacing visually.
10. `docs.nav.endpoints`, `home.demo.endpoint`, `astroPage.stats.endpoint`: headings kept as "Endpoints"/"Endpoint" in Latin, following rule 4. As stand-alone headings they look English.
11. `docs.noKey`, `plans.rows.keys`: "No key needed" → "key ની જરૂર નથી"; "Keys" kept in Latin. A Latin word at the start of a Gujarati phrase looks a little odd.
12. `guides.astrology-positions.inputs`, `guides.astrology-panchang.inputs`: "approximate sidereal offset" → "અંદાજિત નિરયન ઑફસેટ". This means the tropical–sidereal difference (the ayanamsa). "Offset" is a loanword, and a reviewer may prefer "અયનાંશ".
13. `guides.astrology-western-profections.render`: "time lord" → "સમય સ્વામી". This is a Hellenistic term with no established Gujarati equivalent.
14. `guides.astrology-western-primary-directions`, `-secondary-progressions`, `-solar-return`, `-synastry-image`: "primary directions", "progressions", "Solar return" and "synastry" were transliterated (પ્રાઇમરી ડિરેક્શન, પ્રોગ્રેશન, સોલર રિટર્ન, સિનેસ્ટ્રી). These Western techniques have no common Gujarati names.
15. `guides.astrology-vedic-kp.render`: "cusp" → "ભાવ-સંધિ (cusp)". I kept the English in parentheses for KP practitioners.
16. `footer.tagline`: "Sacred content, thoughtfully connected." → "પવિત્ર કન્ટેન્ટ, વિચારપૂર્વક જોડાયેલું." This is a brand line, and "કન્ટેન્ટ" is a loanword in a devotional slogan. "પવિત્ર સામગ્રી" would sound more literary.
17. `sacred-audio-api.sections.s0.title`: "A recording belongs with its content" → "રેકોર્ડિંગ તેના કન્ટેન્ટ સાથે જ શોભે". This is idiomatic but loose ("looks right with").
18. `home.story.quote`: "daily practice" → "દૈનિક સાધના". This is a devotional reading of "practice". It could also be "દૈનિક અભ્યાસ".
19. `mantraPage.ledeCollection_*`: "{{title}} is in the {{deities}} collection(s)". The Gujarati genitive is not applied to the interpolated deity list, so it reads "X {{deities}} સંગ્રહમાં છે". This is grammatical, but it depends on how `{{deities}}` is joined.
20. `bookPage.all`: "All {{terms}}" → "તમામ {{terms}}". I used invariant તમામ because બધા/બધી/બધાં would need to agree with the gender of the inserted term (for example વલ્લીઓ).
21. `books.term.Pada` → "પાદ" (sutra section) vs `calc.pada` → "પદ" (nakshatra quarter). The two spellings are intentional, but a reviewer may want to confirm them.
22. `mantraPage.deityPage.lede_one`: the English "{{n}} mantra and stotras" is itself odd. I rendered it as "{{n}} મંત્ર અને સ્તોત્ર".

### Merge check

`node merge-locale.mjs gu` reported: `gu: 1269 keys, ok`.

## Bengali (bn) translation notes

Standard written Bengali (cholito bhasha), polite আপনি forms, sentences end with "।". Western digits kept throughout. Tech terms use common English loanwords in Bengali script. The rule-4 terms stay in Latin script. I used plain "key" in Latin script everywhere, to match "API key", with the genitive written "key-র" (for example "লাইভ key", "স্যান্ডবক্স key").

### Glossary

| English | Bengali |
|---|---|
| sandbox | স্যান্ডবক্স |
| live key | লাইভ key |
| paid key | পেইড key |
| request | রিকোয়েস্ট |
| response | রেসপন্স |
| call (API call) | কল |
| plan | প্ল্যান |
| Free (plan) | ফ্রি |
| monthly requests | মাসিক রিকোয়েস্ট |
| quota / allowance | কোটা |
| recording | রেকর্ডিং |
| signed link | সাইনড লিংক |
| verse | শ্লোক |
| shloka | শ্লোক |
| mantra | মন্ত্র |
| stotra / hymn | স্তোত্র |
| chapter | অধ্যায় |
| collection | সংকলন |
| catalog | ক্যাটালগ |
| library | লাইব্রেরি |
| guide | গাইড |
| integration | ইন্টিগ্রেশন |
| calculation | গণনা |
| capability | সুবিধা |
| operation | অপারেশন |
| field | ফিল্ড |
| null | null (Latin) |
| preview | প্রিভিউ |
| deity | দেবতা |
| transliteration | প্রতিবর্ণীকরণ |
| Sanskrit / Devanagari | সংস্কৃত / দেবনাগরী |
| English rendering (Mantrilo's own) | ইংরেজি রূপান্তর (kept apart from অনুবাদ = translation) |
| retelling | পুনর্কথন |
| source reference | উৎসসূত্র |
| birth chart | জন্মছক |
| chart | ছক |
| Kundli | কুণ্ডলী |
| Kundli / compatibility matching | কোষ্ঠী মিলন |
| Panchang | পঞ্চাঙ্গ |
| tithi / nakshatra / yoga / karana | তিথি / নক্ষত্র / যোগ / করণ |
| rashi / lagna | রাশি / লগ্ন |
| Rising sign (Western) | লগ্ন রাশি |
| ascendant | অ্যাসেন্ডেন্ট (লগ্ন where Vedic) |
| house | ঘর |
| transit / Gochar | গোচর |
| aspect | দৃষ্টি |
| dasha / Vimshottari | দশা / বিংশোত্তরী |
| ayanamsa | অয়নাংশ |
| sidereal / tropical | নিরয়ন / সায়ন |
| divisional chart | বর্গ চার্ট |
| pada (nakshatra quarter) | পদ |
| Upanishad / Bhagavad Gita | উপনিষদ / ভগবদ্গীতা |
| Ramayana / Mahabharata | রামায়ণ / মহাভারত |
| Vedic / Western | বৈদিক / পাশ্চাত্য |
| time zone | টাইমজোন |
| pagination | পেজিনেশন |
| error | এরর |

### Uncertain strings

1. `meta./astrology-api.description` etc.: "Panchang" became **পঞ্চাঙ্গ**. Many Bengali readers know the almanac as পঞ্জিকা. I kept পঞ্চাঙ্গ because the API returns the five limbs. In `calculators.pages.rashi.about.p1`, "most Panchangs" (printed almanacs) and "calendar reform committee" use পঞ্জিকা instead.
2. `guides.search-mantras.summary` and others: "mantras and shlokas" became "মন্ত্র ও শ্লোক", and "verse" is also **শ্লোক**. So shloka and verse share one Bengali word. That is natural in Bengali, but the English distinction between the two is lost.
3. `mantraPage.fields.number` ("Position in the hymn"), `mantraHub.all.showing`: "hymn" became স্তোত্র, the same word as stotra.
4. `mantraHub.all.withARecording` ("with a recording"): this fragment appears to be appended after the "Showing {{n}} of {{total}} hymns" string. Bengali word order doesn't allow a natural trailing phrase, so I rendered it as "(রেকর্ডিংসহ)". Please check how it is joined in code.
5. `calculators.*`, `calc.rising`: "Rising sign" became **লগ্ন রাশি**, and "ascendant" became অ্যাসেন্ডেন্ট. There is no settled Bengali term for the Western rising sign. Vedic Lagna (লগ্ন) is close, so the Western and Vedic labels look alike. `calculators.pages.rising-sign.faqs.a1` ("They are the same point") still reads correctly.
6. `meta./calculators/zodiac-signs.title` and `meta./calculators/rashi.title`: "zodiac sign" and "Rashi" are both রাশি in Bengali. To keep the two pages apart, the Rashi page title and label became "বৈদিক রাশি ক্যালকুলেটর".
7. `calculators.pages.rashi.faqs.a0` (the list of 12 Rashis): the English pairs Sanskrit and English names, such as "Mesha (Aries)". In Bengali both names are the same word (মেষ…), so I listed each name once.
8. `calc.elements.Water` "জল" and `calc.elements.Earth` "পৃথ্বী": astrology tradition in both regions uses the tattva words. In everyday Bangladeshi usage "পানি" is more common for water.
9. `calc.modes.Mutable` "দ্বিস্বভাব": this is the traditional term, but it may be unfamiliar to readers of Western astrology.
10. `calc.placePlaceholder`: the example city "Kathmandu" stays in Latin script. The place search probably expects Latin input.
11. `calc.ofTotal` "{{total}}টির মধ্যে {{n}}": the context is assumed (for example, nakshatra 5 of 27).
12. `meta./pricing.description`, `plans.customerProduct`: "customer-product allowances" became "গ্রাহক-প্রোডাক্টের কোটা". The English concept (the number of apps or sites a plan covers) is itself a little opaque.
13. `shelf.epics` "ইতিহাস (মহাকাব্য)": in modern Bengali, ইতিহাস also means "history". The parenthesis clarifies it.
14. `home.features.title` ("Built for reading, listening and reckoning time."): "reckoning time" became "সময়ের হিসাব". The wordplay is weaker in Bengali.
15. `footer.tagline` ("Sacred content, thoughtfully connected."): rendered as "পবিত্র কনটেন্ট, যত্ন নিয়ে সংযুক্ত।". The brand-line rhythm doesn't fully carry over.
16. `home.story.quote` "দৈনিক সাধনার": I chose "daily practice" → সাধনা (spiritual practice) over অনুশীলন.
17. `home.render.metered` "মিটারিং": this is a loanword, kept apart from গণনা (calculation).
18. `astrology-western-astrocartography-parans.summary`: "planetary crossing zones" became "গ্রহরেখা পরস্পরকে ছেদ করার অঞ্চল", a descriptive phrase because there is no standard Bengali term.
19. `guides.astrology-western-profections.render`: "time lord" became "সময়ের অধিপতি (time lord)". I kept the English term in brackets because there is no established Bengali term.
20. `guides.astrology-vedic-kp.render`: "cusp" became "ভাবসন্ধি (cusp)". The bracketed English is kept for clarity.
21. `guides.astrology-vedic-muhurat-search.summary` and the next guide: "Muhurat windows" became "মুহূর্তের সময়কাল". In Bengali, মুহূর্ত also means just "moment", so the auspicious sense is weaker.
22. `bookPage.invocation` and `upanishads.sandboxCopy`: "Invocation" became মঙ্গলাচরণ. শান্তিপাঠ would be more precise for Upanishads, but that may not suit every book.
23. `plans.forever` "চিরকাল": the fragment probably follows "$0". It may read slightly odd. An alternative is "সবসময়".
24. `books.termPlural.*`: Bengali doesn't inflect these nouns for plural, so the singular and plural values are identical.

### Merge check

`node merge-locale.mjs bn` reported: `bn: 1269 keys, ok`.

## Assamese (as) translation notes

Script: Assamese (ৰ U+09F0, ৱ U+09F1). A scan of all nine files found no Bengali র (U+09B0) and no Bengali verb forms or function words (এবং, করুন, থেকে, জন্য, হবে…). The text uses the polite আপুনি / আপোনাৰ and polite imperatives (-ক: কৰক, চাওক, দিয়ক, লওক, পঠিয়াওক). Sentences end with "।". Loanwords that have an o-sound use the Assamese apostrophe (ল'ড, অডিঅ', ক'ড, কনচ'ল, টাইম জ'ন).

### 1. Glossary

| English | Assamese |
|---|---|
| content (Hindu content API) | সমল |
| request | ৰিকুৱেষ্ট |
| response | ৰেস্পন্স |
| sandbox | ছেণ্ডবক্স |
| live key | লাইভ key |
| sandbox key | ছেণ্ডবক্স key |
| paid (plan/key) | পেইড |
| plan | প্লান |
| Free (plan name) | বিনামূলীয়া |
| monthly requests | মাহেকীয়া ৰিকুৱেষ্ট |
| quota / allowance | কোটা |
| counts toward (quota) | (কোটাত) ধৰা হয় |
| uses one request | এটা ৰিকুৱেষ্ট খৰচ হয় |
| charged / not charged | মাচুল লোৱা হয় / নহয় |
| recording | ৰেকৰ্ডিং |
| audio | অডিঅ' |
| signed link | ছাইন কৰা লিংক |
| verse / shloka | শ্লোক |
| hymn / stotra | স্তোত্ৰ |
| mantra | মন্ত্ৰ |
| chapter | অধ্যায় |
| book | পুথি |
| collection | সংকলন |
| catalog | কেটেলগ |
| Library (site section) | পুথিভঁৰাল |
| mantra library (generic) | মন্ত্ৰ ভঁৰাল |
| guide | গাইড |
| integration | ইণ্টিগ্ৰেচন |
| calculation | গণনা |
| capability (astrology) | সুবিধা |
| operation | অপাৰেচন |
| field | ফিল্ড |
| null | null (Latin) |
| preview | প্ৰিভিউ |
| transliteration | লিপ্যন্তৰ |
| Sanskrit / Devanagari | সংস্কৃত / দেৱনাগৰী |
| English retelling | ইংৰাজী পুনৰ্কথন |
| deity | দেৱতা |
| server / backend | ছাৰ্ভাৰ / বেকএণ্ড |
| console | কনচ'ল |
| workspace | ৱৰ্কস্পেচ |
| pagination | পেজিনেচন |
| error | ত্ৰুটি |
| authentication | প্ৰমাণীকৰণ |
| time zone | টাইম জ'ন |
| birth chart / natal chart | জন্মকুণ্ডলী |
| Kundli | কুণ্ডলী |
| chart (generic, image, Western) | চাৰ্ট |
| Panchang | পঞ্চাংগ |
| tithi / nakshatra / yoga / karana | তিথি / নক্ষত্ৰ / যোগ / কৰণ |
| rashi / sign | ৰাশি |
| zodiac | ৰাশিচক্ৰ |
| Sun / Moon / Rising sign | সূৰ্য ৰাশি / চন্দ্ৰ ৰাশি / উদীয়মান ৰাশি |
| ascendant / Lagna | উদয় লগ্ন / লগ্ন |
| house | ভাৱ |
| transit / Gochar | গোচৰ |
| dasha / Vimshottari | দশা / বিংশোত্তৰী |
| ayanamsa / Lahiri | অয়নাংশ / লাহিড়ী |
| sidereal / tropical | নিৰয়ণ / সায়ন |
| pada (nakshatra quarter) | পদ |
| Pada (sutra division) | পাদ |
| Western / Vedic | পাশ্চাত্য / বৈদিক |
| license | লাইচেন্স |
| terms | চৰ্তাৱলী |
| pricing | মূল্য |

### 2. Uncertain strings

1. `meta./library.label` (and every "Library" label), "Library" → "পুথিভঁৰাল". This is the standard Assamese word for library, but it literally means "book store-house" and the section also holds mantras and astrology. The loanword "লাইব্ৰেৰী" is the alternative.
2. `library.capability` terms (`types.Astrology capability`, `astroPage.stats.capabilities`…), "capability" → "সুবিধা" (feature/facility). "সামৰ্থ্য" or "ক্ষমতা" are more literal but sound stiff. সুবিধা is also used for `pricing.feature` ("Feature").
3. `nav.docs`, `common.readDocs`, "Docs" → "ডকছ". The loanword is spelled several ways in Assamese (ডকছ, ডক্‌ছ). The fuller label uses "ডকুমেণ্টেচন".
4. `calc.rising` / `calc.ascendant`, "Rising sign" → "উদীয়মান ৰাশি" and "Ascendant" → "উদয় লগ্ন". Assamese has no settled term that keeps the Western Rising sign apart from the Vedic Lagna. Both translations are descriptive.
5. `calculators.pages.rashi.faqs.a0`, "Mesha (Aries), Vrishabha (Taurus)…" → "মেষ, বৃষ, …". The English pairs Sanskrit and Western names, but in Assamese both are the same word, so the parentheses were dropped.
6. `calculators.pages.zodiac-signs.about.p0` and the related FAQs, "one sign earlier" → "ঠিক আগৰ ৰাশিটো" (the sign just before). The wording avoids "আগত", which could be read as "ahead".
7. `calc.modes.Mutable` / `Cardinal` / `Fixed` → "দ্বিস্বভাৱ / চৰ / স্থিৰ". These are the Indian-astrology quality names. A Western-astrology reader may expect literal terms.
8. `calc.elements.Earth`, "Earth" → "পৃথিৱী". "ভূমি" is the alternative for the element.
9. `calc.placePlaceholder`, "e.g. Kathmandu" → "যেনে কাঠমাণ্ডু". The example is kept, but "গুৱাহাটী" would feel more local. Also, a city typed in Assamese script may not match the place search.
10. `home.story.role`, "Head of Satyam" → "Satyamৰ মুৰব্বী". "মুৰব্বী" means head or leader. A job title such as "প্ৰধান" is also possible.
11. `home.story.quote`, "daily practice" → "দৈনিক সাধনা". This is a devotional reading of "practice", which seems to be what the quote means.
12. `home.pricing.title`, "Pay as your product grows." → "আপোনাৰ প্ৰডাক্ট বাঢ়ি অহাৰ লগে লগে পইচা দিয়ক।". The marketing line is rendered literally.
13. `shelf.title`, "Scripture, served verse by verse." → "শাস্ত্ৰ, শ্লোকে শ্লোকে পৰিৱেশিত।". The "served" wordplay (food and API) does not carry over.
14. `footer.tagline`, "Sacred content, thoughtfully connected." → "পবিত্ৰ সমল, যত্নেৰে সংযুক্ত।". A brand line that may want a native copywriter's review.
15. `guides.astrology-western-astrocartography-parans.summary`, "planetary crossing zones" → "গ্ৰহবোৰৰ সংযোগ অঞ্চল". This is a technical Western term with no Assamese equivalent.
16. Western techniques (`profections`, `primary-directions`, `secondary-progressions`, `solar-return`, `synastry`, `composite`) are transliterated (প্ৰফেকচন, প্ৰাইমাৰী ডাইৰেকচন, প্ৰগ্ৰেছন, ছ'লাৰ ৰিটাৰ্ণ, ছিনাষ্ট্ৰি, কম্প'জিট). No established Assamese terms exist.
17. `guides.astrology-western-transits.render` / `synastry.render`, "aspects" → "দৃষ্টি". This is the Vedic term. Western astrology in Assamese has no fixed word.
18. `guides.astrology-vedic-kp.render`, "cusp placements" → "কাস্পৰ অৱস্থান". This is a loanword. "ভাৱ সন্ধি" is the alternative.
19. `docs.auth`, "If a key leaks" → "key ফাদিল হ'লে". This is an idiomatic Assamese word for "exposed", and some readers may expect "লিক হ'লে".
20. `docs.nav.endpoints`, "Endpoints" → "Endpointসমূহ". A Latin term with an Assamese plural suffix looks a little hybrid in a nav label.
21. `plans.customQuote`, "Custom quote" → "নিজা মূল্য". Literally "own price". "কাষ্টম ক'ট" is the loanword option.
22. `mantraPage.fields.number`, "Position in the hymn" → "স্তোত্ৰত স্থান". This assumes "hymn" means any mantra or stotra. The site uses "hymn" and "stotra" loosely, and both are translated as স্তোত্ৰ.
23. `info.privacy.referral`, "broad referral category" → "বহল ৰেফাৰেল শ্ৰেণী". The meaning of the English is a little vague, so the translation stays literal.
24. `guides.common.oneRequest`, "Failed calculations are refunded." → "বিফল গণনাত খৰচ হোৱা ৰিকুৱেষ্ট ঘূৰাই দিয়া হয়।". Spelled out as "the request used is given back", because "refund" in Assamese implies money.

### 3. Merge check

`node merge-locale.mjs as` reported: `as: 1269 keys, ok`.

## Punjabi (pa, Gurmukhi) translation notes

Eastern Punjabi in Gurmukhi, as used in Indian Punjab. Formal "you" (ਤੁਸੀਂ). Sentences end with "।".

### Glossary

| English | Punjabi |
|---|---|
| sandbox | ਸੈਂਡਬਾਕਸ |
| live key / sandbox key / paid key | ਲਾਈਵ key / ਸੈਂਡਬਾਕਸ key / ਪੇਡ key ("key" kept in Latin, like "API key") |
| request | ਬੇਨਤੀ (pl. ਬੇਨਤੀਆਂ) |
| call (API call) | ਕਾਲ (pl. ਕਾਲਾਂ) |
| response | ਜਵਾਬ |
| plan | ਪਲਾਨ |
| Free (plan) | ਮੁਫ਼ਤ |
| monthly requests | ਮਹੀਨਾਵਾਰ ਬੇਨਤੀਆਂ |
| quota / allowance | ਕੋਟਾ |
| rate limit | ਰੇਟ ਸੀਮਾ |
| recording | ਰਿਕਾਰਡਿੰਗ |
| signed link / URL | ਸਾਈਨ ਕੀਤਾ ਲਿੰਕ / URL |
| verse | ਸ਼ਲੋਕ |
| shloka | ਸ਼ਲੋਕ |
| mantra | ਮੰਤਰ |
| stotra / hymn | ਸਤੋਤਰ |
| chapter | ਅਧਿਆਇ |
| book | ਪੁਸਤਕ |
| scripture | ਧਰਮ-ਗ੍ਰੰਥ |
| retelling | ਪੁਨਰ-ਕਥਾ |
| epic | ਮਹਾਂਕਾਵਿ |
| collection | ਸੰਗ੍ਰਹਿ |
| catalog | ਕੈਟਾਲਾਗ |
| library | ਲਾਇਬ੍ਰੇਰੀ |
| guide | ਗਾਈਡ |
| docs / documentation | ਦਸਤਾਵੇਜ਼ |
| integration / integrate | ਇੰਟੀਗ੍ਰੇਸ਼ਨ / ਇੰਟੀਗ੍ਰੇਟ ਕਰੋ |
| calculation | ਗਣਨਾ |
| capability | ਸਮਰੱਥਾ |
| operation | ਆਪਰੇਸ਼ਨ |
| birth chart / natal chart / Kundli | ਜਨਮ ਕੁੰਡਲੀ (chart alone: ਕੁੰਡਲੀ) |
| deity | ਦੇਵਤਾ |
| transliteration | ਲਿਪੀਅੰਤਰਨ |
| Sanskrit / Devanagari | ਸੰਸਕ੍ਰਿਤ / ਦੇਵਨਾਗਰੀ |
| translation | ਅਨੁਵਾਦ |
| preview | ਪ੍ਰੀਵਿਊ |
| field | ਫ਼ੀਲਡ |
| null | null (kept as the code value) |
| pagination / page | ਪੇਜੀਨੇਸ਼ਨ / ਪੰਨਾ |
| sample (data) | ਨਮੂਨਾ |
| illustrative response | ਨਮੂਨਾ ਜਵਾਬ |
| synthetic (inputs) | ਕਾਲਪਨਿਕ |
| source reference | ਸਰੋਤ ਹਵਾਲਾ |
| attribution | ਸਰੋਤ-ਸ਼੍ਰੇਯ |
| Panchang / tithi / nakshatra / yoga / karana | ਪੰਚਾਂਗ / ਤਿਥੀ / ਨਕਸ਼ੱਤਰ / ਯੋਗ / ਕਰਣ |
| rashi / zodiac sign | ਰਾਸ਼ੀ |
| lagna / ascendant / rising sign | ਲਗਨ / ਅਸੈਂਡੈਂਟ / ਲਗਨ ਰਾਸ਼ੀ |
| Sun sign / Moon sign | ਸੂਰਜ ਰਾਸ਼ੀ / ਚੰਦਰ ਰਾਸ਼ੀ |
| dasha / Vimshottari | ਦਸ਼ਾ / ਵਿੰਸ਼ੋਤਰੀ |
| ayanamsa / Lahiri | ਅਯਨਾਂਸ਼ / ਲਾਹਿੜੀ |
| sidereal / tropical | ਨਿਰਯਣ / ਸਾਯਨ |
| transit / Gochar | ਗੋਚਰ |
| house | ਘਰ |
| aspect | ਦ੍ਰਿਸ਼ਟੀ |
| nakshatra pada | ਪਦ |
| lord / ruler | ਸੁਆਮੀ |
| Upanishad / Bhagavad Gita / Ramayana / Mahabharata | ਉਪਨਿਸ਼ਦ / ਭਗਵਦ ਗੀਤਾ / ਰਾਮਾਇਣ / ਮਹਾਂਭਾਰਤ |
| Isha Upanishad | ਈਸ਼ ਉਪਨਿਸ਼ਦ |
| Vedic / Western | ਵੈਦਿਕ / ਪੱਛਮੀ |
| user | ਵਰਤੋਂਕਾਰ |
| workspace | ਵਰਕਸਪੇਸ |

### Uncertain strings

1. `guides.*`, `docs.*`, many keys: "verse" is translated as ਸ਼ਲੋਕ, the same word as "shloka". A first draft used ਪਦ, but in Punjabi that also means "word/term" and clashes with nakshatra pada. Strings such as "mantras and shlokas … verseCount" now use one word for both concepts.
2. `calculators.pages.moon-sign.faqs.q0`: "Is the Moon sign the same as the Rashi?" → "ਕੀ ਚੰਦਰ ਰਾਸ਼ੀ ਅਤੇ ਰਾਸ਼ੀ ਇੱਕੋ ਚੀਜ਼ ਹਨ?" In Punjabi ਰਾਸ਼ੀ is the ordinary word for any zodiac sign, so the question sounds close to circular.
3. `calculators.pages.rising-sign.faqs.q1`: "Is the Rising sign the same as the Lagna?" → "ਕੀ ਲਗਨ ਰਾਸ਼ੀ ਅਤੇ ਲਗਨ ਇੱਕੋ ਚੀਜ਼ ਹਨ?" Same problem: the natural Punjabi for "rising sign" already contains ਲਗਨ.
4. `meta./calculators/zodiac-signs.label` and `meta./calculators/rashi.label`: "Zodiac sign calculator" → "ਰਾਸ਼ੀ ਕੈਲਕੁਲੇਟਰ"; "Rashi calculator" → "ਵੈਦਿਕ ਰਾਸ਼ੀ ਕੈਲਕੁਲੇਟਰ". I added "Vedic" to the second label (and to its title) so the two don't read identically.
5. `calculators.pages.rashi.faqs.a0`: "Mesha (Aries), Vrishabha (Taurus) …" → "ਮੇਸ਼ (ਮੇਖ), ਵ੍ਰਿਸ਼ਭ (ਬ੍ਰਿਖ) …". The everyday Punjabi names are given in brackets instead of the English names. Signs whose two names match (ਮਿਥੁਨ, ਕਰਕ…) have no brackets.
6. `calculators.pages.zodiac-signs.about.p0`: "March equinox" → "ਮਾਰਚ ਦੇ ਵਿਸ਼ੁਵ ਬਿੰਦੂ". The term is accurate, but readers may not know it.
7. `calculators.pages.sun-sign.about.heading`: "Born on the cusp?" → "ਕੀ ਤੁਹਾਡਾ ਜਨਮ ਦੋ ਰਾਸ਼ੀਆਂ ਦੇ ਸੰਧੀ-ਕਾਲ 'ਤੇ ਹੋਇਆ?" The idiom doesn't carry over, so this is a paraphrase.
8. `calc.modes.Mutable`: "Mutable" → "ਦਵੀ-ਸੁਭਾਅ" (Cardinal ਚਰ, Fixed ਸਥਿਰ). Spellings of the dual-nature term vary.
9. `calc.placePlaceholder`: "Start typing a city, e.g. Kathmandu" → "ਸ਼ਹਿਰ ਦਾ ਨਾਂ ਲਿਖਣਾ ਸ਼ੁਰੂ ਕਰੋ, ਜਿਵੇਂ Kathmandu". I kept the example in Latin script on the assumption that place search expects Latin input. If Gurmukhi search works, a local city could be used instead.
10. `books.term.Pada` / `books.terms.Pada_*`: sutra "pada" → ਪਾਦ, but nakshatra pada → ਪਦ (`calc.pada`, `home.render.pada`). Both come from Sanskrit pāda. I kept the spellings different to follow common usage in each field.
11. `bookPage.all`, `bookPage.every`, `bookPage.readFirst`: "All {{terms}}" → "ਸਾਰੇ {{terms}}". The adjective is masculine. With ਵੱਲੀਆਂ (feminine) it should be ਸਾਰੀਆਂ, which a single fragment can't express.
12. `footer.tagline`: "Sacred content, thoughtfully connected." → "ਪਵਿੱਤਰ ਸਮੱਗਰੀ, ਸੋਚ-ਸਮਝ ਕੇ ਜੋੜੀ ਹੋਈ।" This is a brand line and loses some of its polish.
13. `home.features.title`: "Built for reading, listening and reckoning time." → "ਪੜ੍ਹਨ, ਸੁਣਨ ਅਤੇ ਸਮੇਂ ਦੀ ਗਣਨਾ ਲਈ ਬਣਾਇਆ ਗਿਆ।" "Reckoning time" is rendered literally as calculating time.
14. `home.story.quote`: "daily practice" → "ਰੋਜ਼ਾਨਾ ਸਾਧਨਾ". This is a customer quote, so the owner may want Satyam to approve the wording.
15. `home.story.role`: "Head of Satyam" → "Satyam ਦੇ ਮੁਖੀ". The person's exact title is not known.
16. Product name "Books API" → "ਪੁਸਤਕ API" everywhere (`meta./books-api.*`, `products.books-api.title`, etc.), to match "ਮੰਤਰ API" and "ਜੋਤਿਸ਼ API". If "Books API" is meant as a fixed product name, it should go back to Latin script.
17. `docs.nav.endpoints`, `home.demo.endpoint`, `astroPage.stats.endpoint`, `plans.rows.keys`: kept as "Endpoint(s)" / "Keys" in Latin script, following the do-not-translate rule. As standalone labels they look English.
18. `mantraPage.fields.number`: "Position in the hymn" → "ਸਤੋਤਰ ਵਿੱਚ ਸਥਾਨ". "Hymn" is ਸਤੋਤਰ throughout (also `mantraHub.all.showing`, `mantraPage.alternates_*`), but some records are mantras, not stotras.
19. `mantraPage.ledeReturns` / `ledeReturnsAudio`: "GET {{path}} returns its {{verses}} …" → "… ਇਸ ਦੇ {{verses}} …". This assumes {{verses}} is a Punjabi count string such as "12 ਸ਼ਲੋਕ" (from `common.verses_*`).
20. `privacy.referral`: "broad referral category" → "ਮੋਟੀ ਰੈਫ਼ਰਲ ਸ਼੍ਰੇਣੀ". "Broad" is ambiguous; ਮੋਟੀ (coarse) is my reading.
21. `contact.astrologyTitle`: "Plan an astrology inquiry." → "ਜੋਤਿਸ਼ ਬਾਰੇ ਪੁੱਛਗਿੱਛ ਦੀ ਯੋਜਨਾ ਬਣਾਓ।" The literal phrasing is slightly awkward.
22. `plans.customQuote` / `plans.requestQuote`: "Custom quote" → "ਕਸਟਮ ਕੀਮਤ"; "Request a quote" → "ਕੀਮਤ ਦਾ ਅੰਦਾਜ਼ਾ ਮੰਗੋ". There is no single settled term for a sales quote.
23. `guides.astrology-western-*` (profections, primary directions, progressions, parans, astrocartography, synastry, Solar return): mostly loanwords in Gurmukhi (ਪ੍ਰੋਫ਼ੈਕਸ਼ਨ, ਪ੍ਰਾਇਮਰੀ ਡਾਇਰੈਕਸ਼ਨ, ਸਿਨੇਸਟ੍ਰੀ, ਸੋਲਰ ਰਿਟਰਨ…), because Punjabi has no established terms for them.
24. `guides.astrology-moon-phase.render`: "phase and illumination" → "ਕਲਾ ਅਤੇ ਰੌਸ਼ਨੀ ਦਾ ਪ੍ਰਤੀਸ਼ਤ". "Percentage" was added to clarify, though the value is 0–1.
25. `docs.auth`: "cross-origin" kept in Latin script. There is no common Punjabi developer term for it.

### Check

`node merge-locale.mjs pa` reported: `pa: 1268 keys, ok`.

Note: the English source file `en/07-home.json` still had `home.hero.title` + `titleAccent`, but the repo's en.json now has `home.hero.heading` (with `<br/>` and `<accent>`). I translated the current `heading` key.

## Odia (or) translation notes

### Glossary

| English | Odia |
|---|---|
| sandbox | ସ୍ୟାଣ୍ଡବକ୍ସ |
| live key | ଲାଇଭ୍ key |
| sandbox key | ସ୍ୟାଣ୍ଡବକ୍ସ key |
| paid key / paid plan | ପେଡ୍ key / ପେଡ୍ ପ୍ଲାନ୍ |
| request | ଅନୁରୋଧ |
| response | ରେସପନ୍ସ |
| call (API call) | କଲ୍ |
| plan | ପ୍ଲାନ୍ |
| Free (plan) | ମାଗଣା |
| monthly requests | ମାସିକ ଅନୁରୋଧ |
| quota / allowance | କୋଟା |
| limit | ସୀମା |
| rate limit | ରେଟ୍ ଲିମିଟ୍ |
| recording | ରେକର୍ଡିଂ |
| signed link | ସାଇନ୍ ହୋଇଥିବା ଲିଙ୍କ୍ |
| preview | ପ୍ରିଭ୍ୟୁ |
| verse / shloka | ଶ୍ଲୋକ |
| mantra / stotra / hymn | ମନ୍ତ୍ର / ସ୍ତୋତ୍ର / ସ୍ତୋତ୍ର |
| chapter | ଅଧ୍ୟାୟ |
| collection | ସଂଗ୍ରହ |
| catalog | କାଟାଲଗ୍ |
| book | ପୁସ୍ତକ |
| retelling | ପୁନର୍କଥନ |
| guide | ଗାଇଡ୍ |
| integration / integrate | ଇଣ୍ଟିଗ୍ରେସନ୍ / ଇଣ୍ଟିଗ୍ରେଟ୍ କରନ୍ତୁ |
| calculation | ଗଣନା |
| capability | ସୁବିଧା |
| operation | ଅପରେସନ୍ |
| field | ଫିଲ୍ଡ |
| null | null (Latin) |
| birth chart | ଜନ୍ମ ଚାର୍ଟ |
| Kundli | କୁଣ୍ଡଳୀ |
| deity | ଦେବତା |
| Sanskrit / Devanagari | ସଂସ୍କୃତ / ଦେବନାଗରୀ |
| transliteration | ଲିପ୍ୟନ୍ତର |
| translation / English rendering | ଅନୁବାଦ |
| source reference | ଉତ୍ସ ସନ୍ଦର୍ଭ |
| Panchang / tithi / nakshatra / yoga / karana | ପଞ୍ଚାଙ୍ଗ / ତିଥି / ନକ୍ଷତ୍ର / ଯୋଗ / କରଣ |
| rashi / lagna / pada | ରାଶି / ଲଗ୍ନ / ପାଦ |
| Dasha / Vimshottari | ଦଶା / ବିଂଶୋତ୍ତରୀ |
| ayanamsa / Lahiri | ଅୟନାଂଶ / ଲାହିରୀ |
| sidereal / tropical | ନିରୟଣ / ସାୟନ |
| Vedic / Western | ବୈଦିକ / ପାଶ୍ଚାତ୍ୟ |
| Sun sign / Moon sign / Rising sign | ସୂର୍ଯ୍ୟ ରାଶି / ଚନ୍ଦ୍ର ରାଶି / ଲଗ୍ନ ରାଶି |
| ascendant | ଆସେଣ୍ଡାଣ୍ଟ (Western), ଲଗ୍ନ (Vedic) |
| house | ଭାବ |
| transit / Gochar | ଗୋଚର |
| Muhurat | ମୁହୂର୍ତ୍ତ |
| instant (point in time) | କ୍ଷଣ |
| zodiac | ରାଶିଚକ୍ର |
| horoscope / Rashifal | ରାଶିଫଳ |
| forecast | ପୂର୍ବାନୁମାନ |
| compatibility / matching | ମେଳନ |
| Upanishad / Bhagavad Gita / Ramayana / Mahabharata | ଉପନିଷଦ / ଭଗବଦ୍ ଗୀତା / ରାମାୟଣ / ମହାଭାରତ |
| pagination / paginate | ପେଜିନେସନ୍ / ପେଜିନେଟ୍ କରନ୍ତୁ |
| authentication | ପ୍ରମାଣୀକରଣ |
| documentation / docs | ଡକ୍ୟୁମେଣ୍ଟେସନ୍ / ଡକ୍ସ |
| console | କନସୋଲ୍ |
| workspace | ୱର୍କସ୍ପେସ୍ |
| customer product | ଗ୍ରାହକ ଉତ୍ପାଦ |
| time zone | ଟାଇମ୍ ଜୋନ୍ (but `timezone` kept Latin where it is the parameter) |

### Uncertain strings

1. `meta./calculators/zodiac-signs.label` and `title` — "Zodiac sign calculator" → "ରାଶି କ୍ୟାଲକୁଲେଟର". In Odia "zodiac sign" and "Rashi" are the same word (ରାଶି), so I titled the Rashi page "ବୈଦିକ ରାଶି କ୍ୟାଲକୁଲେଟର" (label too) to keep the two pages distinguishable.
2. `calculators.pages.rising-sign.*`, `calc.rising` — "Rising sign" → "ଲଗ୍ନ ରାଶି", while Vedic "Lagna" → "ଲଗ୍ନ". Odia has no separate everyday word for the Western rising sign; FAQ "Is the Rising sign the same as the Lagna?" reads "ଲଗ୍ନ ରାଶି ଓ ଲଗ୍ନ କ'ଣ ଏକା?", which is slightly tautological.
3. `calculators.pages.rashi.faqs.a0` — "Mesha (Aries), Vrishabha (Taurus)…" → plain list "ମେଷ, ବୃଷ, ମିଥୁନ…". Odia uses the same names for Western and Vedic signs, so the English glosses in parentheses were dropped.
4. `calculators.pages.zodiac-signs.faqs.a1` — "Moon sign (Rashi)" → "ଚନ୍ଦ୍ର ରାଶି (ରାଶି)"; the gloss is redundant in Odia.
5. `calc.ascendant`, `calc.vedicAscendant` — "Ascendant" → "ଆସେଣ୍ଡାଣ୍ଟ" (loanword) to separate it from ଲଗ୍ନ; a native reader might prefer ଲଗ୍ନ for both.
6. `guides.astrology-western-midheaven-sign.*` — "Midheaven" → "ମଧ୍ୟାକାଶ (Midheaven)"; no settled Odia term.
7. `guides.astrology-western-profections.render` — "time lord" → "ସମୟ-ସ୍ୱାମୀ (time lord)"; coined, English kept in brackets.
8. `guides.astrology-western-*` (synastry, progressions, solar return, profections, primary directions, astrocartography) — transliterated as loanwords (ସିନାଷ୍ଟ୍ରି, ପ୍ରୋଗ୍ରେସନ୍, ସୋଲାର୍ ରିଟର୍ନ…); no established Odia terms.
9. `guides.astrology-chart.render` — "divisions, ascendant, planets and houses" translated as concepts (ବିଭାଗୀୟ ଚାର୍ଟ, ଲଗ୍ନ, ଗ୍ରହ ଓ ଭାବ). They may be field names inside `data.charts`; if so they should be in Latin.
10. `guides.astrology-daily-panchang.render`, `guides.astrology-panchang.render` — kept `sunrise, sunset, tithi, nakshatra, yoga, karanas, rahuKalam` in Latin, assuming they are response field names.
11. `guides.astrology-chart.inputs` and similar — `latitude`, `longitude`, `timezone`, `date`, `birth` kept in Latin because they are request parameters in the code; reads slightly mixed.
12. `modes.Cardinal/Fixed/Mutable` — "ଚର / ସ୍ଥିର / ଦ୍ୱିସ୍ୱଭାବ" (traditional Indian sign qualities); correct, but Western-astrology readers may not expect these.
13. `calc.westernFacts`, `calc.lord` — "ruled by {{ruler}}" / "lord {{lord}}" → "ସ୍ୱାମୀ {{ruler}}" / "ସ୍ୱାମୀ {{lord}}"; terse fragments, depends on how they render in context.
14. `mantraPage.deityPage.lede_*` — "{{n}} mantras and stotras for {{name}}" → "{{name}} ପାଇଁ …"; the respectful ଙ୍କ suffix was dropped because `{{name}}` may be Latin script.
15. `mantraPage.ledeCollection_*` — "{{title}} is in the {{deities}} collection" → "{{title}} {{deities}} ସଂଗ୍ରହରେ ଅଛି।"; word order okay but depends on `{{deities}}` format.
16. `mantraPage.ledeReturns*`, `bookPage.lede*` — `{{verses}}` is assumed to be a pre-formatted phrase like "12 verses"; word order built around that.
17. `bookPage.readFirst` / `every` / `all` — `{{term}}`/`{{terms}}` come from `books.term*`; in Odia singular and plural are identical, so `termPlural` values equal `term` values.
18. `books.terms.Adhyaya_*` vs `Chapter_*` — both "ଅଧ୍ୟାୟ"; indistinguishable in Odia.
19. `shelf.volume` — "vol" → "ଭାଗ" to avoid colliding with Khanda (ଖଣ୍ଡ), which is the usual Odia word for "volume".
20. `products.mantra-api.sections.s0/s2`, `sacred-audio-api.sections.s0` — "listening control" → "ଶୁଣିବା ବଟନ୍" (listen button); slightly narrower than the English.
21. `home.story.quote` — "daily practice" → "ଦୈନିକ ସାଧନା"; a customer testimonial, so the owner may want Satyam to approve the wording.
22. `home.story.eyebrow` — "Customer story" → "ଗ୍ରାହକଙ୍କ ଅନୁଭୂତି" (customer's experience); a free rendering.
23. `footer.tagline` — "Sacred content, thoughtfully connected." → "ପବିତ୍ର କଣ୍ଟେଣ୍ଟ, ଯତ୍ନର ସହ ସଂଯୁକ୍ତ।"; brand line, nuance of "thoughtfully" partly lost.
24. `home.features.title` — "reckoning time" → "ସମୟ ଗଣନା"; loses the slight literary flavour.
25. `home.features.items.iast.copy` — "so ahaṃ stays ahaṃ" → "ahaṃ, ahaṃ ହିଁ ରହେ"; wordplay doesn't fully carry.
26. `calc.placePlaceholder` — kept "Kathmandu" in Latin so users type the city in Latin script, which place search probably expects; an Odia city (e.g. Bhubaneswar) may suit Odia readers better.
27. `docs.limits.burst`, `plans.rateLimit` — "Burst" → "ବର୍ଷ୍ଟ" (loanword); no natural Odia term.
28. `docs.nav.endpoints`, `home.demo.endpoint`, `astroPage.stats.endpoint` — left as Latin "Endpoint(s)" per the brief's rule; reads as English in the nav.
29. `meta./books-api.label`, `products.books-api.title` — "Books API" rendered "ପୁସ୍ତକ API" (consistent with "ମନ୍ତ୍ର API"); revert to Latin if "Books API" is meant as a fixed product name.
30. `meta./library/books.description`, `shelf.lede` — "Advaita classics" → "ଅଦ୍ୱୈତ ଗ୍ରନ୍ଥ" (Advaita texts); "classics" softened.
31. `info.license.publicTitle` — "Public-domain Sanskrit" → "ସାର୍ବଜନୀନ (ପବ୍ଲିକ୍ ଡୋମେନ୍) ସଂସ୍କୃତ"; legal term glossed with the loanword.
32. `calculators.faq.privacy.q` — "Do you store…" → "ଆପଣମାନେ କ'ଣ…ସାଇତି ରଖନ୍ତି?" addressing the company with plural ଆପଣମାନେ.

### Merge check

`node merge-locale.mjs or` reported: `or: 1269 keys, ok`.

## Tamil (ta) translation notes

### Glossary

| English | Tamil |
|---|---|
| sandbox | சாண்ட்பாக்ஸ் |
| live / live key | லைவ் / லைவ் key |
| key (API key) | key / API key (Latin script) |
| request | கோரிக்கை |
| response | பதில் |
| call (API call) | அழைப்பு |
| plan | திட்டம் |
| paid plan | கட்டணத் திட்டம் |
| Free (plan) | இலவசம் |
| monthly requests | மாதாந்திரக் கோரிக்கைகள் |
| quota / allowance | ஒதுக்கீடு |
| rate limit | வேக வரம்பு |
| usage | பயன்பாடு |
| recording | ஒலிப்பதிவு |
| audio | ஒலி |
| signed link | signed இணைப்பு |
| verse | செய்யுள் |
| shloka | ஸ்லோகம் |
| mantra | மந்திரம் |
| stotra | ஸ்தோத்திரம் |
| hymn | துதிப்பாடல் |
| chapter / adhyaya | அத்தியாயம் |
| collection | தொகுப்பு |
| catalog | கேட்டலாக் |
| library | நூலகம் |
| book / scripture | நூல் / வேத நூல் |
| retelling | மறுகூறல் |
| guide | வழிகாட்டி |
| integration | ஒருங்கிணைப்பு |
| calculation | கணக்கீடு |
| capability | திறன் |
| operation | operation (kept in Latin, it is an API field/concept) |
| birth chart | பிறப்பு ஜாதகம் |
| chart (generic) | ஜாதகம் |
| Kundli | ஜாதகம் (குண்டலி in the one title that names both) |
| deity | தெய்வம் |
| transliteration | ஒலிபெயர்ப்பு |
| translation | மொழிபெயர்ப்பு |
| Sanskrit / Devanagari | சமஸ்கிருதம் / தேவநாகரி |
| preview | முன்னோட்டம் |
| field | புலம் |
| null | null (Latin) |
| pagination | பக்கமாக்கல் |
| Panchang | பஞ்சாங்கம் |
| tithi / nakshatra / yoga / karana | திதி / நட்சத்திரம் / யோகம் / கரணம் |
| rashi / lagna | ராசி / லக்னம் |
| dasha / Vimshottari | தசை (தசா in compounds) / விம்சோத்தரி |
| ayanamsa | அயனாம்சம் |
| sidereal / tropical | நிராயன / சாயன |
| transit / Gochar | பெயர்ச்சி / கோசாரம் |
| Muhurat | முகூர்த்தம் |
| Rashifal / horoscope | ராசிபலன் |
| Sun / Moon / Rising sign | சூரிய ராசி / சந்திர ராசி / உதய ராசி |
| house | பாவம் |
| Upanishad | உபநிடதம் |
| Isha Upanishad | ஈச உபநிடதம் |
| Bhagavad Gita | பகவத் கீதை |
| Ramayana / Mahabharata | இராமாயணம் / மகாபாரதம் |
| epics (Itihasa) | இதிகாசங்கள் |
| Vedic / Western | வேத / மேற்கத்திய |
| server / backend / cache / app | சர்வர் / பேக்எண்ட் / கேஷ் / ஆப் |

### Uncertain strings

1. `guides.*` and many others, "verse" → செய்யுள். Tamil has no single settled word for a scripture verse. செய்யுள் is clear but literary. வசனம் and ஸ்லோகம் are the alternatives. I kept ஸ்லோகம் for "shloka" so the two stay distinct.
2. Catalog → கேட்டலாக் (loanword). பட்டியல் was already taken for "list". அட்டவணை is used for "index".
3. `meta./docs/guides/vedic-birth-chart.title`, "Vedic Birth Chart & Kundli API…" → "வேத பிறப்பு ஜாதகம் & குண்டலி API…". Tamil users say ஜாதகம் for Kundli. Elsewhere Kundli → ஜாதகம், so this title says the same thing twice.
4. `meta./astrology-api/planetary-positions.title`, "Sidereal & Tropical" → "நிராயன & சாயன". These are the correct traditional terms, but some developers may not know them.
5. Isha Upanishad → ஈச உபநிடதம் (everywhere). ஈசாவாஸ்ய உபநிடதம் is also common.
6. `calculators.pages.rashi.faqs.a0`, the 12 Rashis "Mesha (Aries)…". The Sanskrit and Tamil names are the same in Tamil, so I gave one list of 12 names with no parentheses.
7. `calculators.pages.zodiac-signs.about.p0`, "March equinox" → "மார்ச் சம இரவு நாள்". This is an uncommon coinage. "மார்ச் விஷுவம்" is an alternative.
8. `calculators.pages.lagna.about.p1`, "whole-sign houses" → "முழு ராசி பாவ முறை (whole-sign houses)". I kept the English in parentheses because the Tamil term is not standard.
9. `guides.astrology-western-profections.*`, "profection" → புரொஃபெக்ஷன் (transliteration). There is no Tamil term for it.
10. `guides.astrology-western-primary-directions.summary`, "primary direction" → "முதன்மை திசை (primary direction)". The literal term clashes with திசை/தசை (dasha), so I kept the English gloss.
11. `guides.astrology-western-secondary-progressions.*` and `progressions-*`, "progressions" → முன்னேற்றம். This is a literal coinage, with the English gloss in parentheses in two places.
12. `guides.astrology-western-solar-return.*`, "Solar return" → "சூரிய மீள்வருகை". This is a coinage.
13. `guides.astrology-western-synastry-image.summary`, "synastry" → சினாஸ்ட்ரி (transliteration). Elsewhere "Compare two natal charts" is translated descriptively.
14. `guides.astrology-western-ephemeris`, and `calculators.faq.accuracy.a`, "ephemeris" → எஃபெமெரிஸ் with a gloss (கிரக நிலை அட்டவணை) in the FAQ.
15. `calc.modes.*`, Cardinal/Fixed/Mutable → சரம்/ஸ்திரம்/உபயம். These are the traditional Tamil astrology terms. They are correct, but they sit inside a "Western facts" line.
16. `calc.planets.Jupiter` → குரு. வியாழன் is the astronomical or weekday name. குரு is the usual name in astrology.
17. `calc.lord` "lord {{lord}}" and `calc.westernFacts` "ruled by {{ruler}}" → "அதிபதி {{…}}". This reads well as a label, but I am not sure how it joins with the text around it.
18. `bookPage.readFirst` "Read {{term}} {{n}}" → "{{term}} {{n}}-ஐப் படியுங்கள்". The -ஐ suffix after a number is fine, but it is not checked against the rendered UI.
19. `bookPage.all` "All {{terms}}" → "அனைத்து {{terms}}". Tamil would normally add -உம் to the noun, but a suffix can't be attached to a placeholder cleanly.
20. `books.term.Question` → கேள்வி (used for the Prashna Upanishad). The traditional form is பிரச்னம். I chose the literal word for clarity.
21. `books.term.Prapathaka` → பிரபாடகம். This is a rare word, and the spelling varies (பிரபாதகம்).
22. `books.term.Adhyaya` and `Chapter` both → அத்தியாயம். They can't be told apart in Tamil.
23. `library.facets.Darshana` → தரிசனம். This is the usual spelling, but it also means "a sacred viewing". தர்சனம் is the philosophical spelling.
24. `home.story.quote`, "daily practice" → "தினசரி வழிபாடு" (daily worship). This is a slight shift in meaning so it sounds natural.
25. `home.story.role` "Head of Satyam" → "Satyam தலைவர்". The real job title is unknown.
26. `home.features.title`, "reckoning time" → "காலம் கணிக்க". The English wordplay does not carry over.
27. `footer.tagline` "Sacred content, thoughtfully connected." → "புனித உள்ளடக்கம், சிந்தனையுடன் இணைக்கப்பட்டது." This brand line is literal and may want a copywriter's pass.
28. `home.hero.title`/`titleAccent`. These are split across two keys ("இந்து உள்ளடக்க API" + "டெவலப்பர்களுக்காக."). Tamil word order would put the second part first, but the split forces this order.
29. `docs.limits.burst` and `plans.rateLimit` "burst" are kept in Latin script. No Tamil word fits well.
30. `chrome.breadcrumb` is kept as "Breadcrumb". This is aria-only text, and there is no common Tamil term.
31. `calc.placePlaceholder`, the example city was changed from Kathmandu to சென்னை (Chennai) for Tamil readers. Revert it if the example has to match the English.
32. `plans.requestsPerMonthPrefix` is left as an empty string, the same as the English. The number is followed by "கோரிக்கைகள் / மாதம்".
33. `info.privacy.warning`, "operator privacy policy" → "இயக்குநர் தனியுரிமைக் கொள்கை". இயக்குநர் can also mean "director".

### Check

`node merge-locale.mjs ta` reported: `ta: 1269 keys, ok`.

## Telugu (te) translation notes

### Glossary

| English | Telugu |
|---|---|
| sandbox | శాండ్‌బాక్స్ |
| live key | లైవ్ key |
| API key / key | API key / key (Latin) |
| request | రిక్వెస్ట్ |
| response | రెస్పాన్స్ |
| plan | ప్లాన్ |
| monthly requests | నెలవారీ రిక్వెస్ట్‌లు (table: రిక్వెస్ట్‌లు / నెల) |
| quota / allowance | కోటా |
| recording | రికార్డింగ్ |
| verse (also shloka) | శ్లోకం |
| chapter | అధ్యాయం |
| collection | కలెక్షన్ |
| catalog | కేటలాగ్ |
| guide | గైడ్ |
| integration / integrate | ఇంటిగ్రేషన్ / ఇంటిగ్రేట్ చేయండి |
| calculation | గణన |
| capability | సామర్థ్యం |
| operation | ఆపరేషన్ |
| birth chart (Vedic) / Kundli | జాతక చక్రం / జాతకం |
| natal / birth chart (Western) | జన్మ చార్ట్ |
| chart (Vedic, D1/D9, North/South Indian) | చక్రం |
| deity | దేవత |
| transliteration | లిప్యంతరీకరణ |
| Sanskrit / Devanagari | సంస్కృతం / దేవనాగరి |
| preview | ప్రివ్యూ |
| field | ఫీల్డ్ |
| null | null (Latin, code value) |
| sample | నమూనా |
| scripture / book | గ్రంథం |
| retelling | పునఃకథనం |
| source reference | మూల ప్రస్తావన |
| Panchang / tithi / nakshatra / yoga / karana | పంచాంగం / తిథి / నక్షత్రం / యోగం / కరణం |
| rashi (birth rashi) / lagna / dasha / ayanamsa | రాశి (జన్మ రాశి) / లగ్నం / దశ / అయనాంశ |
| Sun / Moon / Rising sign | సూర్య రాశి / చంద్ర రాశి / లగ్న రాశి |
| ascendant (Western) | ఆసెండెంట్ |
| house | భావం |
| transit / Gochar | గోచారం |
| compatibility / matching | పొంతన |
| sidereal / tropical | సైడీరియల్ / ట్రాపికల్ (calculator prose adds నిరయన / సాయన) |
| Western / Vedic | పాశ్చాత్య / వైదిక |
| Upanishad / Bhagavad Gita / Ramayana / Mahabharata | ఉపనిషత్తు / భగవద్గీత / రామాయణం / మహాభారతం |
| epics (Itihasa) | ఇతిహాసాలు |
| mantra / stotra (hymn) | మంత్రం / స్తోత్రం |
| signed link | signed లింక్ |
| pagination | పేజినేషన్ |
| Free (plan) | ఉచితం |
| customer product | కస్టమర్ ప్రోడక్ట్ |
| rate limit / burst | రేట్ లిమిట్ / బర్స్ట్ |

### Uncertain strings

- `home.hero.title` + `home.hero.titleAccent`: "Hindu content API" / "for developers." → "హిందూ కంటెంట్ API," / "డెవలపర్‌ల కోసం." In Telugu word order "for developers" naturally comes first, so I added a comma to make the split read well. Check how it looks in the hero layout.
- Verse vs shloka: both are శ్లోకం. "Mantras and shlokas" and "verses" therefore use the same word. Telugu has no common separate word for "verse" in scripture.
- `books.term.Chapter` and `books.term.Adhyaya`: both are అధ్యాయం, because "chapter" is అధ్యాయం in Telugu.
- `calc.modes.*`: Cardinal/Fixed/Mutable → చర / స్థిర / ద్విస్వభావ. These are the traditional Indian sign qualities. They appear as adjectives without "రాశి", so they may read as fragments next to the element.
- `calc.westernFacts`: "ruled by {{ruler}}" → "అధిపతి {{ruler}}". This is natural in Telugu but loses the passive voice.
- `calc.planets.Mars`: కుజుడు (the Jyotisha name) is used for Western contexts too. Some Telugu readers expect అంగారకుడు.
- `calc.planets.Jupiter`: గురుడు. బృహస్పతి is the alternative.
- Birth chart terms: Vedic uses జాతక చక్రం and Western uses జన్మ చార్ట్. This is deliberate, but it gives one English term two Telugu renderings.
- `calc.rashi` / `calculators.pages.rashi.*`: "Rashi" here means the Moon-sign rashi, so I wrote జన్మ రాశి. In Telugu bare రాశి means any sign. The `meta./calculators/rashi.label` uses "జన్మ రాశి కాలిక్యులేటర్" so it differs from the generic "రాశి కాలిక్యులేటర్" (zodiac-signs).
- `meta./calculators/zodiac-signs.title`: "Zodiac Sign Calculator" → "రాశి కాలిక్యులేటర్". This is close to the Rashi calculator title.
- `calculators.pages.rising-sign.faqs.q1`: "Is the Rising sign the same as the Lagna?" Both terms are లగ్నం in Telugu, so I rewrote it as "లగ్న రాశి, వైదిక లగ్నం ఒకటేనా?"
- Isha Upanishad → ఈశావాస్య ఉపనిషత్తు everywhere, including the collection list. ఈశోపనిషత్తు is an equally common name.
- `calc.placePlaceholder`: I kept "Kathmandu" in Latin script because the place search probably matches Latin names. Change it to కాఠ్మండు (or a Telugu city) if the search accepts Telugu input.
- `home.story.role`: "Head of Satyam" → "Satyam అధినేత". The exact title may differ.
- `footer.tagline`: "Sacred content, thoughtfully connected." → "పవిత్ర కంటెంట్, శ్రద్ధగా అనుసంధానించబడింది." The brand line does not carry over with the same lightness.
- `features.title`: "reckoning time" → "కాలగణన". This is accurate, but the wordplay is lost.
- `home.faq.title`: "Good to know." → "తెలుసుకోవాల్సిన విషయాలు." (a paraphrase).
- Western techniques (profection, primary directions, synastry, astrocartography, Solar return, Midheaven, progressions) are transliterated (ప్రొఫెక్షన్, సినాస్ట్రీ, మిడ్‌హెవెన్…). Telugu has no settled native terms for them.
- `guides.common.oneRequest`: "Failed calculations are refunded" → the request is given back (రిక్వెస్ట్ తిరిగి ఇవ్వబడుతుంది). I chose this to avoid implying a money refund.
- `mantraPage.ledeIds` / `alternates_*`: I kept "ids" as a Latin plural ("{{n}} ids కింద"). It reads as developer jargon.
- `plans.rows.keys` = "Keys" is left in Latin under the API key rule. It is the only table header not in Telugu.
- `pricing.lede` and similar: "Subscribe" → సబ్‌స్క్రైబ్ చేయండి (loanword). This is common, but formal Telugu would use చందా.

### Check

`node merge-locale.mjs te` reported: `te: 1269 keys, ok`.

## Kannada (kn): translation notes

### Glossary

| English | Kannada |
|---|---|
| sandbox | ಸ್ಯಾಂಡ್‌ಬಾಕ್ಸ್ |
| live key | ಲೈವ್ key |
| API key / key | API key / key (Latin) |
| request | ವಿನಂತಿ |
| response | ಪ್ರತಿಕ್ರಿಯೆ |
| call (API call) | ಕರೆ |
| plan | ಪ್ಲಾನ್ |
| Free (plan) | ಉಚಿತ |
| monthly requests | ಮಾಸಿಕ ವಿನಂತಿಗಳು / ತಿಂಗಳಿಗೆ … ವಿನಂತಿಗಳು |
| quota / allowance | ಕೋಟಾ |
| limit / rate limit | ಮಿತಿ / ರೇಟ್ ಲಿಮಿಟ್ |
| recording | ರೆಕಾರ್ಡಿಂಗ್ |
| signed link | signed ಲಿಂಕ್ |
| verse / shloka | ಶ್ಲೋಕ |
| mantra / stotra / hymn | ಮಂತ್ರ / ಸ್ತೋತ್ರ / ಸ್ತೋತ್ರ |
| chapter | ಅಧ್ಯಾಯ |
| collection | ಸಂಗ್ರಹ |
| catalog | ಕ್ಯಾಟಲಾಗ್ |
| library (site section) | ಗ್ರಂಥಾಲಯ |
| guide | ಮಾರ್ಗದರ್ಶಿ |
| documentation / docs | ದಾಖಲಾತಿ |
| reference | ಉಲ್ಲೇಖ |
| integration / integrate | ಇಂಟಿಗ್ರೇಷನ್ / ಇಂಟಿಗ್ರೇಟ್ ಮಾಡಿ |
| calculation | ಲೆಕ್ಕಾಚಾರ |
| capability | ಸಾಮರ್ಥ್ಯ |
| operation | ಆಪರೇಷನ್ |
| birth chart / chart | ಜನ್ಮ ಕುಂಡಲಿ / ಕುಂಡಲಿ |
| Kundli | ಕುಂಡಲಿ |
| deity | ದೇವತೆ |
| transliteration | ಲಿಪ್ಯಂತರ |
| Devanagari / Sanskrit | ದೇವನಾಗರಿ / ಸಂಸ್ಕೃತ |
| retelling | ಪುನರ್‌ಕಥನ |
| preview | ಮುನ್ನೋಟ |
| field | ಫೀಲ್ಡ್ |
| null | null (Latin) |
| pagination | ಪೇಜಿನೇಷನ್ |
| page through | ಪುಟಗಳನ್ನು ಸರಿಸಿ |
| source reference | ಮೂಲ ಉಲ್ಲೇಖ |
| Panchang | ಪಂಚಾಂಗ |
| tithi / nakshatra / yoga / karana | ತಿಥಿ / ನಕ್ಷತ್ರ / ಯೋಗ / ಕರಣ |
| rashi / lagna / pada | ರಾಶಿ / ಲಗ್ನ / ಪಾದ |
| dasha / Vimshottari | ದಶಾ (ದಶೆ) / ವಿಂಶೋತ್ತರಿ |
| ayanamsa / Lahiri | ಅಯನಾಂಶ / ಲಾಹಿರಿ |
| sidereal / tropical | ನಿರಯಣ / ಸಾಯನ |
| Sun / Moon / Rising sign | ಸೂರ್ಯ ರಾಶಿ / ಚಂದ್ರ ರಾಶಿ / ಉದಯ ರಾಶಿ |
| ascendant | ಆರೋಹಣ |
| zodiac sign (Western, generic) | ರಾಶಿಚಕ್ರ ಚಿಹ್ನೆ |
| house (astrology) | ಭಾವ |
| transit / Gochar | ಗೋಚಾರ |
| horoscope / Rashifal | ರಾಶಿ ಭವಿಷ್ಯ / ರಾಶಿಫಲ |
| Western / Vedic | ಪಾಶ್ಚಾತ್ಯ / ವೈದಿಕ |
| Upanishad(s) | ಉಪನಿಷತ್ / ಉಪನಿಷತ್ತುಗಳು |
| Bhagavad Gita / Isha Upanishad | ಭಗವದ್ಗೀತೆ / ಈಶಾವಾಸ್ಯ ಉಪನಿಷತ್ |
| epic(s) | ಮಹಾಕಾವ್ಯ(ಗಳು) |
| Books API | ಪುಸ್ತಕಗಳ API |

### Uncertain strings

| Key | English | Kannada | Reason |
|---|---|---|---|
| guides.*, docs.* (many) | verse | ಶ್ಲೋಕ | Kannada uses ಶ್ಲೋಕ for both "verse" and "shloka", so "mantras and shlokas" and "verses" share one word. For prose epics "verse" never applies, so this seemed safe. |
| meta./books-api.label, products.books-api.title | Books API | ಪುಸ್ತಕಗಳ API | Unclear whether "Books API" is a fixed product name (Latin) or descriptive. I translated it to match ಮಂತ್ರ API / ಜ್ಯೋತಿಷ್ಯ API. |
| meta./calculators/zodiac-signs.title | Zodiac Sign Calculator | ರಾಶಿಚಕ್ರ ಚಿಹ್ನೆ ಕ್ಯಾಲ್ಕುಲೇಟರ್ | In Kannada, "sign" and "Rashi" are both ರಾಶಿ. I used ರಾಶಿಚಕ್ರ ಚಿಹ್ನೆ to keep this page distinct from the Rashi calculator. It sounds slightly bookish. |
| calc.rising, meta./calculators/rising-sign.* | Rising sign | ಉದಯ ರಾಶಿ | No settled Kannada term for the Western rising sign. ಉದಯ ರಾಶಿ is used to keep it apart from ಲಗ್ನ (Vedic). |
| calculators.pages.rashi.faqs.a0 | Mesha (Aries), … | ಮೇಷ (ಏರೀಸ್), … | The Kannada names for Western and Vedic signs are identical, so the English names are transliterated in the parentheses. |
| calculators.pages.sun-sign.about.p1 | a Western Gemini but a Vedic Taurus | ಪಾಶ್ಚಾತ್ಯ ಪದ್ಧತಿಯಲ್ಲಿ ಮಿಥುನ ಆದರೆ ವೈದಿಕ ಪದ್ಧತಿಯಲ್ಲಿ ವೃಷಭ | Same issue: the contrast now rests on "system" rather than on the sign names. |
| calculators.faq.accuracy.a | astronomical ephemeris | ಖಗೋಳ ಪಂಚಾಂಗ (ephemeris) | ಪಂಚಾಂಗ also means the Hindu almanac. The English word is added in parentheses. |
| calculators.pages.lagna.about.p1 | whole-sign houses | ಸಂಪೂರ್ಣ-ರಾಶಿ (whole-sign) ಭಾವಗಳು | Technical term with no standard Kannada form. |
| calc.modes.* | Cardinal / Fixed / Mutable | ಚರ / ಸ್ಥಿರ / ದ್ವಿಸ್ವಭಾವ | These are the traditional Indian equivalents. Western readers may expect literal terms. |
| calc.planets.Mars | Mars | ಮಂಗಳ | ಕುಜ is equally common in Kannada astrology. |
| guides.astrology-western-* | transits, aspects, profection, primary directions, progressions, Solar return, synastry, Midheaven | ಗೋಚಾರ, ದೃಷ್ಟಿ (aspects), ಪ್ರೊಫೆಕ್ಷನ್, ಪ್ರೈಮರಿ ಡೈರೆಕ್ಷನ್, ಪ್ರೋಗ್ರೆಷನ್, ಸೋಲಾರ್ ರಿಟರ್ನ್, ಸಿನಾಸ್ಟ್ರಿ, ಮಧ್ಯಾಕಾಶ (Midheaven) | Western-only techniques with no Kannada terms. They are mostly transliterated, with the English added in parentheses where it helps. |
| guides.astrology-western-astrocartography-recommendations.summary | Rank destinations for a selected focus | ಆಯ್ದ ಗಮನದ ಕ್ಷೇತ್ರಕ್ಕೆ ಗಮ್ಯಸ್ಥಾನಗಳನ್ನು ಶ್ರೇಣೀಕರಿಸಿ | "focus" (life area such as career or love) is ambiguous in English. |
| home.features.title | Built for reading, listening and reckoning time. | ಓದಲು, ಕೇಳಲು ಮತ್ತು ಕಾಲಗಣನೆಗಾಗಿ ನಿರ್ಮಿಸಲಾಗಿದೆ. | "reckoning time" is rendered as ಕಾಲಗಣನೆ (time reckoning). The poetic tone is partly lost. |
| footer.tagline | Sacred content, thoughtfully connected. | ಪವಿತ್ರ ವಿಷಯ, ಕಾಳಜಿಯಿಂದ ಜೋಡಿಸಲಾಗಿದೆ. | Brand line. "thoughtfully" is rendered as "with care". |
| home.story.quote | daily practice | ದೈನಂದಿನ ಸಾಧನೆ | ಸಾಧನೆ (spiritual practice) also means "achievement" in everyday Kannada. ದೈನಂದಿನ ಆಚರಣೆ is an alternative. |
| home.story.role | Head of Satyam | Satyam ಮುಖ್ಯಸ್ಥರು | The exact title is unknown. |
| home.render.metered | Metered | ಅಳೆಯುವುದು | Short table label. The meaning, "what is metered", may read awkwardly. |
| docs.limits.burst, plans.rateLimit | Burst | ಬರ್ಸ್ಟ್ | Transliterated. Most Kannada readers won't know it, but no native term exists. |
| docs.endpoints.get-chapter.notes | `<epic>Ramayana and Mahabharata</epic> require a live key.` | `<epic>ರಾಮಾಯಣ ಮತ್ತು ಮಹಾಭಾರತ</epic> ಕ್ಕೆ ಲೈವ್ key ಬೇಕು.` | The case suffix sits outside the tag, so the link text lacks its suffix. Check that it renders without a stray space. |
| quick.request, about.sandbox, faq.commercialA, libraryCallout | link/tag text followed by a suffix (`</goals>ಯನ್ನು`, `</docs>ಯನ್ನು`, `</link>ಯನ್ನು`, `</library>ವನ್ನು`) | — | Kannada case endings attach directly to the tagged word, so the suffix follows the closing tag. This renders correctly but looks unusual in source. |
| mantraPage.deityPage.lede_* | {{n}} mantras and stotras for {{name}} | {{name}} ದೇವರ {{n}} ಮಂತ್ರಗಳು… | Assumes {{name}} is a deity name. ದೇವರ ("of the god") may sound odd for a goddess or a group. |
| mantraPage.ledeReturns | returns its {{verses}} | ಇದರ {{verses}} ಅನ್ನು … | {{verses}} is the formatted "N ಶ್ಲೋಕಗಳು" string, and ಅನ್ನು after it is fine. Check if the code injects something else. |
| calc.placePlaceholder | e.g. Kathmandu | ಉದಾ. Kathmandu | The city is kept in Latin script, assuming the place search expects Latin input. ಬೆಂಗಳೂರು would be more local if Kannada input works. |
| plans.requestsPerMonthPrefix | "" | "ತಿಂಗಳಿಗೆ " | The English prefix is empty. Kannada puts "per month" before the number, so the prefix now carries it (with a trailing space, since the code adds none). |
| bookPage.invocation | Invocation | ಪ್ರಾರ್ಥನೆ | ಶಾಂತಿ ಮಂತ್ರ may be more precise for Upanishad invocations, but it is too specific to use everywhere. |
| meta./astrology-api/instant-panchang.* | Instant Panchang | ತತ್‌ಕ್ಷಣದ ಪಂಚಾಂಗ | Literal coinage for an "at one instant" Panchang. ಕ್ಷಣಿಕ was avoided because it means "fleeting". |

### Check

`node merge-locale.mjs kn` reported: `kn: 1269 keys, ok`.

## Malayalam (ml) translation notes

Register: polite നിങ്ങൾ; UI actions use the standard -ുക imperative (പരീക്ഷിക്കുക, പകർത്തുക). Sentences end with ".". Western digits kept. Case endings on Latin-script terms are hyphenated (API-യിൽ, Mantrilo-യുടെ, {{title}}-നെക്കുറിച്ച്).

### Glossary

| English | Malayalam |
|---|---|
| request | റിക്വസ്റ്റ് |
| response | റെസ്പോൺസ് |
| call (API call) | കോൾ |
| sandbox | സാൻഡ്‌ബോക്സ് |
| key / live key / sandbox key | കീ / ലൈവ് കീ / സാൻഡ്‌ബോക്സ് കീ (but "API key" stays Latin) |
| plan | പ്ലാൻ |
| Free (plan) | സൗജന്യം |
| monthly requests | പ്രതിമാസ റിക്വസ്റ്റുകൾ |
| quota / allowance | ക്വോട്ട |
| limit / rate limit | പരിധി / റേറ്റ് പരിധി |
| pricing | നിരക്കുകൾ |
| recording | റെക്കോർഡിംഗ് |
| signed link | സൈൻ ചെയ്ത ലിങ്ക് |
| verse / shloka | ശ്ലോകം |
| mantra / stotra / hymn | മന്ത്രം / സ്തോത്രം / സ്തോത്രം |
| chapter | അധ്യായം |
| book / scripture | പുസ്തകം / ഗ്രന്ഥം |
| collection | ശേഖരം |
| catalog | കാറ്റലോഗ് |
| library | ലൈബ്രറി |
| guide | ഗൈഡ് |
| integration | ഇന്റഗ്രേഷൻ |
| calculation | കണക്കുകൂട്ടൽ |
| capability | കേപ്പബിലിറ്റി |
| operation | ഓപ്പറേഷൻ |
| field | ഫീൽഡ് |
| null | null (Latin) |
| preview | പ്രിവ്യൂ |
| transliteration | ലിപ്യന്തരണം |
| Sanskrit / Devanagari | സംസ്കൃതം / ദേവനാഗരി |
| translation | വിവർത്തനം |
| English rendering | ഇംഗ്ലീഷ് ആവിഷ്കാരം |
| retelling (prose) | (ഗദ്യ) പുനരാഖ്യാനം |
| epic | ഇതിഹാസം |
| deity | ദേവത |
| birth chart / natal chart | ജനന ചാർട്ട് |
| Kundli | ജാതകം |
| Kundli matching | ജാതകപ്പൊരുത്തം |
| Panchang | പഞ്ചാംഗം |
| tithi / nakshatra / yoga / karana | തിഥി / നക്ഷത്രം / യോഗം / കരണം |
| rashi / lagna / pada | രാശി / ലഗ്നം / പാദം |
| Sun sign / Moon sign / Rising sign | സൂര്യരാശി / ചന്ദ്രരാശി / ഉദയരാശി |
| ascendant (Western) | അസെൻഡന്റ് |
| dasha / Vimshottari | ദശ / വിംശോത്തരി |
| ayanamsa | അയനാംശം |
| sidereal / tropical | നിരയന / സായന |
| transit (Western) / Gochar | ട്രാൻസിറ്റ് / ഗോചരം |
| horoscope (daily) / Rashifal | രാശിഫലം |
| house (chart) | ഭാവം |
| Upanishad / Isha Upanishad | ഉപനിഷത്ത് / ഈശോപനിഷത്ത് |
| Bhagavad Gita / Ramayana / Mahabharata | ഭഗവദ്ഗീത / രാമായണം / മഹാഭാരതം |
| Vedic / Western | വൈദിക / പാശ്ചാത്യ |
| time zone | സമയമേഖല |
| server / backend / app | സെർവർ / ബാക്കെൻഡ് / ആപ്പ് |
| customer product | കസ്റ്റമർ പ്രോഡക്റ്റ് |
| docs / documentation | ഡോക്സ് / ഡോക്യുമെന്റേഷൻ |
| error | പിശക് |

### Uncertain strings

| Key | English | Malayalam | Reason |
|---|---|---|---|
| plans.requestsPerMonthPrefix / plans.requestsPerMonth | "" / "requests / month" | "പ്രതിമാസം " / "റിക്വസ്റ്റുകൾ" | English prefix is empty (the check rejects empty values) and Malayalam needs "per month" before the number, so the phrase is split around `<strong>`. The prefix has a trailing space on purpose. |
| (global) request, response | request / response | റിക്വസ്റ്റ് / റെസ്പോൺസ് | I used loanwords over the formal അഭ്യർത്ഥന / പ്രതികരണം. Both are used; developers lean toward the loanwords. |
| (global) capability | capability | കേപ്പബിലിറ്റി | No natural native word (ശേഷി, സവിശേഷത) fits a catalog item, so I used a loanword. It reads a little clunky. |
| (global) verse vs shloka | verse / shloka | ശ്ലോകം (both) | Malayalam uses ശ്ലോകം for both, so "mantras and shlokas" and "verses" share a word. |
| (global) hymn | hymn | സ്തോത്രം | Same word as stotra. സ്തുതി or കീർത്തനം were the alternatives. |
| books.term.Chapter / Adhyaya | Chapter / Adhyaya | അധ്യായം (both) | Malayalam has one word for both, so the two terms can't be told apart. |
| books.term.Question | Question | ചോദ്യം | Prashna Upanishad sections are traditionally പ്രശ്നം, but in modern Malayalam that word means "problem". |
| bookPage.invocation, upanishads.sandboxCopy | Invocation | ശാന്തിപാഠം | This is the Upanishadic shanti invocation. It may not fit if this label is also used for other kinds of invocation. |
| bookPage.all | All {{terms}} | {{terms}} എല്ലാം | Word order is reversed because a case ending can't be added after the inserted plural. |
| bookPage.every | Every {{term}} page | ഓരോ {{term}} പേജും | The noun is inserted bare (e.g. "ഓരോ അധ്യായം പേജും"). It is understandable but not perfectly idiomatic. |
| calc.westernFacts, calc.lord | ruled by {{ruler}} / lord {{lord}} | അധിപൻ {{ruler}} / അധിപൻ {{lord}} | Fragments: "lord X" word order kept so it joins cleanly. |
| calc.modes.* | Cardinal / Fixed / Mutable | ചരം / സ്ഥിരം / ഉഭയം | Uses the Indian chara/sthira/ubhaya equivalents for the Western modes. |
| calculators.pages.rashi.faqs.a0 | Mesha (Aries), … | മേഷം (മേടം), … | Sanskrit name with the common Kerala name in brackets; English sign names dropped. Western sign names elsewhere use the Kerala names (മേടം, ഇടവം…). These are also Malayalam month names. |
| meta./calculators/zodiac-signs.* | Zodiac sign calculator | രാശിചക്ര കാൽക്കുലേറ്റർ | "Zodiac sign" and "Rashi" both translate to രാശി, so this page is "zodiac calculator" and the Rashi page is ജന്മരാശി കാൽക്കുലേറ്റർ. |
| calc.ascendant, rising-sign pages | Ascendant | അസെൻഡന്റ് | Loanword, used to keep it apart from ലഗ്നം (Lagna). Malayalam astrology would normally just say ലഗ്നം. |
| guides.astrology-western-* | progressions, profection, synastry, parans, astrocartography | പ്രോഗ്രഷൻ, പ്രൊഫെക്ഷൻ, സിനാസ്ട്രി… | Transliterated Western techniques with no established Malayalam terms. |
| guides.astrology-western-profections.render | time lord | കാലാധിപൻ | Coined calque. |
| guides.common.oneRequest | Failed calculations are refunded. | …റിക്വസ്റ്റ് തിരികെ ലഭിക്കും | Rendered as "the request is given back"; the exact sense of "refunded" is slightly unclear. |
| home.hero.title + titleAccent | Hindu content API / for developers. | ഹൈന്ദവ ഉള്ളടക്ക API / ഡെവലപ്പർമാർക്കായി. | The split headline keeps the English order. Malayalam would usually put "for developers" first. |
| home.story.quote | customer testimonial | (translated) | This is a translated quote from a named person. The owner may prefer to keep it in English or have Satyam approve it. |
| calc.placePlaceholder | e.g. Kathmandu | ഉദാ. Kathmandu | Kept in Latin script, assuming the place search expects Latin input. A local example (Kochi) may suit better. |
| meta./books-api.label, products.books-api.title | Books API | Books API | Kept as a product name in Latin. "Mantra API" was translated (മന്ത്ര API), so the two are inconsistent. |
| home.demo.endpoint, docs.nav.endpoints, astroPage.stats.endpoint | Endpoint(s) | Endpoint(s) | Left in Latin per the "endpoint" rule. They are headings, so they appear in English. |
| info.contact.email | Work email | ഔദ്യോഗിക ഇമെയിൽ | "Official email" is the natural Malayalam phrase. |
| home.features.title | …reading, listening and reckoning time. | …കാലഗണനയ്ക്കുമായി… | "Reckoning time" rendered as കാലഗണന (time-reckoning), so the wordplay is lost. |
| footer.tagline | Sacred content, thoughtfully connected. | പവിത്ര ഉള്ളടക്കം, ശ്രദ്ധയോടെ ബന്ധിപ്പിച്ചത്. | Brand line. This is a literal rendering. |

### Check

`node merge-locale.mjs ml` reported: `ml: 1269 keys, ok`.

## Urdu (ur) translation notes

Formal آپ throughout. Urdu punctuation (۔ ، ؟). Western digits kept. Latin-script terms (API, JSON, REST, endpoint, API key, key, IAST, UTC, IANA, ISO 8601, Bearer, Mantrilo, Satyam, Starter/Growth/Business, field and parameter names, paths) kept in Latin. No direction marks added.

### Glossary

| English | Urdu |
|---|---|
| mantra | منتر |
| shloka | شلوک |
| stotra | ستوتر |
| hymn | بھجن |
| verse | بند |
| chapter | باب (pl. ابواب) |
| book | کتاب |
| collection | مجموعہ |
| catalog | کیٹلاگ |
| library | لائبریری |
| deity | دیوتا |
| Sanskrit | سنسکرت |
| Devanagari | دیوناگری |
| transliteration | نقل حرفی |
| translation | ترجمہ |
| retelling (prose) | (نثری) بازگوئی |
| epics / Itihasa | رزمیے / اتہاس |
| invocation | منگلاچرن |
| Upanishad(s) | اپنشد |
| Bhagavad Gita | بھگود گیتا |
| Ramayana / Mahabharata | رامائن / مہابھارت |
| Isha Upanishad | ایش اپنشد |
| sandbox | سینڈ باکس |
| live key | لائیو key |
| paid key / paid plan | ادائیگی والی key / ادائیگی والا پلان |
| request | درخواست |
| response | رسپانس |
| plan | پلان |
| Free (plan) | مفت |
| monthly requests | ماہانہ درخواستیں |
| quota / allowance | کوٹہ |
| rate limit | ریٹ لمٹ |
| recording | ریکارڈنگ |
| signed link | سائن شدہ لنک |
| preview | پیش منظر |
| guide | گائیڈ |
| integration | انٹیگریشن |
| documentation / docs | دستاویزات |
| calculation | حساب |
| capability | صلاحیت |
| operation | آپریشن |
| field | فیلڈ |
| null | null (kept as code) |
| pagination | صفحہ بندی |
| placeholder | placeholder (kept Latin) |
| astrology (Vedic) | جیوتش |
| astrology (Western) / Western astrology | نجوم / مغربی نجوم |
| birth chart / natal chart | پیدائشی زائچہ |
| chart | زائچہ |
| kundli | کنڈلی |
| Panchang | پنچانگ |
| tithi / nakshatra / yoga / karana | تتھی / نکشتر / یوگ / کرن |
| rashi / lagna | راشی / لگن |
| zodiac sign (Western) | برج |
| zodiac (as a system) | بروج |
| Sun / Moon / Rising sign | شمسی / قمری / طالع برج |
| ascendant | طالع |
| house | خانہ |
| aspect | نظر |
| transit | ٹرانزٹ (Vedic: گوچر) |
| dasha / Vimshottari | دشا / ومشوتری |
| ayanamsa | اینانش |
| sidereal / tropical | سائیڈریل / ٹراپیکل |
| pada (nakshatra quarter) | پد |
| pada (sutra division) | پاد |
| ephemeris | تقویم |
| forecast / horoscope | پیش گوئی / ستاروں کا حال |

### Uncertain strings

| Key | English | Urdu | Reason |
|---|---|---|---|
| (global) verse | verse | بند | Urdu has no settled neutral word for a scripture verse; شلوک would collide with "shloka", آیت is Quranic. بند (stanza) is clear but less devotional. |
| (global) astrology | Astrology | جیوتش | Used جیوتش for the product area (Hindu context); Western-specific strings use نجوم. Some readers may expect علم نجوم for the nav label. |
| (global) response | response | رسپانس | Loanword chosen over جواب for API context; درخواست (native) kept for request. Mixed register is deliberate. |
| (global) live key, sandbox key | live key | لائیو key | "key" kept in Latin per the API key rule, giving mixed-script phrases. |
| calculators.pages.rashi.faqs.a1 | first syllable of a name | نام کے پہلے حرفِ صوت | "syllable" has no common Urdu word; حرفِ صوت is understandable but slightly bookish. |
| calculators.pages.lagna.about.p1 | whole-sign houses | ہول سائن خانوں | Technical term transliterated; no established Urdu equivalent. |
| calc.modes.* | Cardinal / Fixed / Mutable | منقلب / ثابت / ذوجسدین | Classical Urdu/Persian astrology terms; accurate but unfamiliar to many readers. |
| calc.elements.* | Fire / Earth / Air / Water | آتشی / خاکی / ہوائی / آبی | Adjectival forms used because they appear in "{{element}} · {{mode}}" fragments; may read oddly if shown alone. |
| calc.westernFacts | {{element}} · {{mode}} · ruled by {{ruler}} | {{element}} · {{mode}} · حاکم {{ruler}} | Fragment; depends on how ruler names render inline. |
| guides.astrology-western-midheaven-sign.* | Midheaven | وسط السماء | Arabic astrological term; correct but formal. |
| guides.astrology-western-solar-return.* and -image | Solar return | سولر ریٹرن | Transliterated; no common Urdu term. |
| guides.astrology-western-profections / primary-directions / secondary-progressions / synastry / astrocartography / parans | profection, primary directions, progressions, synastry, parans | پروفیکشن، پرائمری ڈائریکشن، پروگریشن، سنیسٹری، پیرانز | Specialist Western techniques transliterated; no Urdu equivalents in use. |
| guides.astrology-western-ephemeris.summary context; calculators.faq.accuracy.a | ephemeris | تقویم | تقویم also means calendar/almanac; acceptable but broader. |
| guides.astrology-chart.render | divisions | ورگ | Vedic varga term used for chart divisions; parameter name stays Latin. |
| guides.labels.envelope | Response envelope | رسپانس کا ڈھانچا | "envelope" metaphor doesn't carry over; used "structure". |
| home.features.title | Built for reading, listening and reckoning time. | پڑھنے، سننے اور وقت کے حساب کے لیے بنایا گیا۔ | Brand line; "reckoning time" loses its literary tone. |
| footer.tagline | Sacred content, thoughtfully connected. | مقدس مواد، سوچ سمجھ کر جوڑا گیا۔ | Brand line; literal rendering, may want a copywriter's touch. |
| home.story.quote | daily practice | روزانہ کی عبادت | عبادت is the natural Urdu word but has an Islamic flavour; ریاضت or سادھنا are alternatives. |
| home.story.role | Head of Satyam | سربراہ، Satyam | Word order of title + Latin brand in RTL may look unusual. |
| plans.requestsPerMonthPrefix / plans.requestsPerMonth | "" / requests / month | ماہانہ  / درخواستیں | English prefix is empty, but the check rejects empty values, so the Urdu uses the prefix slot: "ماہانہ <b>N</b> درخواستیں". Verify the rendering on the pricing cards. |
| books.terms.* / termPlural.* | adhyaya, khanda, mundaka, prapathaka, valli | ادھیائے، کھنڈ، منڈک، پرپاٹھک، ولی | Transliterated Sanskrit; most have identical singular/plural in Urdu. |
| bookPage.readFirst / bookPage.every | Read {{term}} {{n}} / Every {{term}} page | {{term}} {{n}} پڑھیں / ہر {{term}} صفحہ | Depends on what {{term}} receives at runtime (Urdu term vs English). |
| mantraPage.ledeReturns(Audio) | returns its {{verses}} | اس کے {{verses}} … واپس کرتا ہے | Assumes {{verses}} is the localized common.verses_* string. |
| meta./pricing.description | customer-product allowances | کسٹمر پروڈکٹ کی اجازتوں | "allowance" here means a count of products, not quota; rendered as permissions. |
| info.eyebrow.about | About | تعارف | Chosen as a short eyebrow; elsewhere "About X" is "X کے بارے میں". |
| calc.placePlaceholder | e.g. Kathmandu | مثلاً کٹھمنڈو | Kept the example city; the place search may expect Latin input, so an Urdu-script example might mislead users about what to type. |

### Merge check

`node merge-locale.mjs ur` reported: `ur: 1269 keys, ok`.

## Checked after translation

- **Place search accepts native script.** `GET /v1/public/places` returns Kathmandu for "काठमाडौं" and Chennai for "சென்னை", because GeoNames alternate names cover them. The calculator's city placeholder can therefore name a local city in any script.
