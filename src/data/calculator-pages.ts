// The free sign calculators on mantrilo.com. Every page runs the same calculation (the API's
// `signs` operation through its keyless public endpoint); each one leads with a different result
// and explains it, so each answers its own search.

export type SignFocus = 'all' | 'sun' | 'moon' | 'rising' | 'rashi' | 'lagna' | 'nakshatra';

export type CalculatorPage = {
  slug: string;
  path: string;
  focus: SignFocus;
  /** Breadcrumb and card label. */
  label: string;
  title: string;
  description: string;
  heading: string;
  lede: string;
  /** Whether the result needs a birth time to be exact. */
  needsTime: boolean;
  about: { heading: string; paragraphs: string[] };
  faqs: [string, string][];
};

const privacy: [string, string] = [
  'Do you store my birth details?',
  'No. Your date, time and place are sent once to calculate the result and are not saved or logged. The result stays in this browser tab.',
];
const accuracy: [string, string] = [
  'How accurate is it?',
  'Planetary positions come from an astronomical ephemeris for the exact minute and place you enter. Signs are only uncertain when a body sits right on a sign boundary or the birth time is approximate, so a time to the nearest few minutes gives the best result.',
];

export const calculatorPages: CalculatorPage[] = (
  [
    {
      slug: 'zodiac-signs',
      focus: 'all',
      label: 'Zodiac sign calculator',
      title: 'Zodiac Sign Calculator: Sun, Moon, Rising and Vedic Signs | Mantrilo',
      description:
        'Find your Sun, Moon and Rising signs plus your Vedic Rashi, Lagna and Nakshatra from your birth date, time and place. Free, no sign-up.',
      heading: 'Find all your signs, Western and Vedic.',
      lede: 'Enter your birth date, time and place to see your Sun, Moon and Rising signs, and your Vedic Rashi, Lagna, Sun sign and Nakshatra side by side.',
      needsTime: true,
      about: {
        heading: 'Why you have two sets of signs',
        paragraphs: [
          'Western astrology uses the tropical zodiac, which starts at the March equinox. Vedic (Jyotish) astrology uses the sidereal zodiac, which is fixed to the stars. The two have drifted about 24 degrees apart, so most people’s Vedic signs fall one sign earlier than their Western ones.',
          'Your Sun sign depends only on your birth date. Your Moon sign changes every two to three days, and your Rising sign (Lagna in Vedic astrology) changes about every two hours, so those need your birth time and place.',
        ],
      },
      faqs: [
        [
          'Why is my Vedic sign different from my Western sign?',
          'The Vedic zodiac is measured against the fixed stars and the Western zodiac against the seasons. The difference between them, called the ayanamsa, is about 24 degrees today, so a planet at 10° Gemini in the Western zodiac sits at about 16° Taurus in the Vedic one.',
        ],
        [
          'Which signs matter most?',
          'Western astrology leads with the Sun sign. Vedic astrology leads with the Moon sign (Rashi) and the ascendant (Lagna), and uses the Moon’s Nakshatra for names, matching and the Vimshottari Dasha.',
        ],
        accuracy,
        privacy,
      ],
    },
    {
      slug: 'sun-sign',
      focus: 'sun',
      label: 'Sun sign calculator',
      title: 'Sun Sign Calculator: Western and Vedic Sun Sign | Mantrilo',
      description:
        'Find your Sun sign from your birth date, with the exact degree, and see your Vedic (sidereal) Sun sign too. Free sun sign calculator, no sign-up.',
      heading: 'What is my Sun sign?',
      lede: 'Your Sun sign is the zodiac sign the Sun was in when you were born. Enter your birth date to see it to the degree, along with your Vedic Sun sign.',
      needsTime: false,
      about: {
        heading: 'Born on the cusp?',
        paragraphs: [
          'The Sun changes sign around the 20th of each month, but the exact moment moves by up to a day from year to year. If you were born near a change, the date alone can’t settle it: add your birth time and place for the exact answer.',
          'In Vedic astrology the Sun is measured against the stars, so it enters each sign about three weeks later. That’s why many people are, for example, a Western Gemini but a Vedic Taurus.',
        ],
      },
      faqs: [
        [
          'Do I need my birth time for my Sun sign?',
          'Usually not. The Sun moves about one degree a day, so only people born within a day of a sign change need their birth time and place.',
        ],
        [
          'What are the Sun sign dates?',
          'Roughly: Aries Mar 21–Apr 19, Taurus Apr 20–May 20, Gemini May 21–Jun 20, Cancer Jun 21–Jul 22, Leo Jul 23–Aug 22, Virgo Aug 23–Sep 22, Libra Sep 23–Oct 22, Scorpio Oct 23–Nov 21, Sagittarius Nov 22–Dec 21, Capricorn Dec 22–Jan 19, Aquarius Jan 20–Feb 18, Pisces Feb 19–Mar 20. The exact boundaries shift slightly each year.',
        ],
        privacy,
      ],
    },
    {
      slug: 'moon-sign',
      focus: 'moon',
      label: 'Moon sign calculator',
      title: 'Moon Sign Calculator: Find Your Moon Sign | Mantrilo',
      description:
        'Calculate your Moon sign from your birth date, time and place, in both the Western and the Vedic zodiac. Free Moon sign calculator, no sign-up.',
      heading: 'What is my Moon sign?',
      lede: 'Your Moon sign is the zodiac sign the Moon was in at the moment you were born. Enter your birth details to find it in both the Western and Vedic zodiacs.',
      needsTime: true,
      about: {
        heading: 'Why the Moon needs a birth time',
        paragraphs: [
          'The Moon moves about 13 degrees a day and changes sign every two to three days. If it changed sign on your birthday, the time you were born decides which sign it was in.',
          'If you don’t know your birth time, leave it blank. The calculator uses midday and tells you when the Moon changed sign that day, so you know whether the answer is certain.',
        ],
      },
      faqs: [
        [
          'Is the Moon sign the same as the Rashi?',
          'In Vedic astrology, yes: your Rashi is your Moon sign in the sidereal zodiac. It is usually one sign earlier than your Western Moon sign.',
        ],
        accuracy,
        privacy,
      ],
    },
    {
      slug: 'rising-sign',
      focus: 'rising',
      label: 'Rising sign calculator',
      title: 'Rising Sign Calculator: Find Your Ascendant | Mantrilo',
      description:
        'Calculate your Rising sign (ascendant) from your birth date, exact time and place. See your Vedic Lagna too. Free rising sign calculator, no sign-up.',
      heading: 'What is my Rising sign?',
      lede: 'Your Rising sign, or ascendant, is the zodiac sign that was rising on the eastern horizon when you were born. Enter your birth date, time and place to find it.',
      needsTime: true,
      about: {
        heading: 'Why the exact time matters',
        paragraphs: [
          'The whole zodiac rises over the horizon once a day, so the Rising sign changes roughly every two hours, and faster or slower depending on your latitude. Being off by 15 minutes can change it, so use the time on your birth certificate if you can.',
          'The place matters too. The calculator uses your birthplace’s coordinates and its historical time zone, including daylight saving time, to work out the exact moment of your birth.',
        ],
      },
      faqs: [
        [
          'What if I don’t know my birth time?',
          'Then your Rising sign can’t be calculated reliably. Your Sun sign and, on most days, your Moon sign still can.',
        ],
        [
          'Is the Rising sign the same as the Lagna?',
          'They are the same point. The Lagna is the ascendant measured in the Vedic (sidereal) zodiac, so it is usually one sign earlier than the Western Rising sign.',
        ],
        privacy,
      ],
    },
    {
      slug: 'rashi',
      focus: 'rashi',
      label: 'Rashi calculator',
      title: 'Rashi Calculator: Find Your Vedic Moon Sign | Mantrilo',
      description:
        'Find your Rashi (Vedic Moon sign) and Nakshatra from your birth date, time and place, calculated with the Lahiri ayanamsa. Free, no sign-up.',
      heading: 'What is my Rashi?',
      lede: 'Your Rashi is the sign the Moon occupied at your birth in the Vedic (sidereal) zodiac. Enter your birth details to find your Rashi, its lord and your Nakshatra.',
      needsTime: true,
      about: {
        heading: 'Rashi in Vedic astrology',
        paragraphs: [
          'Vedic astrology gives the Moon sign more weight than the Sun sign. Your Rashi is used for daily horoscopes (rashifal), for Gochar (transits) and, with your Nakshatra, for Kundli matching.',
          'This calculator uses the Lahiri (Chitrapaksha) ayanamsa, the standard adopted by the Government of India’s calendar reform committee and used by most Panchangs.',
        ],
      },
      faqs: [
        [
          'What are the 12 Rashis?',
          'Mesha (Aries), Vrishabha (Taurus), Mithuna (Gemini), Karka (Cancer), Simha (Leo), Kanya (Virgo), Tula (Libra), Vrishchika (Scorpio), Dhanu (Sagittarius), Makara (Capricorn), Kumbha (Aquarius) and Meena (Pisces).',
        ],
        [
          'Is my Rashi based on my name?',
          'A name Rashi (naam rashi) is chosen from the first syllable of a name. Your birth Rashi, calculated here, comes from the Moon’s position when you were born and is the one used in a Kundli.',
        ],
        privacy,
      ],
    },
    {
      slug: 'lagna',
      focus: 'lagna',
      label: 'Lagna calculator',
      title: 'Lagna Calculator: Find Your Vedic Ascendant | Mantrilo',
      description:
        'Calculate your Lagna (Vedic ascendant) from your birth date, exact time and place, with its Nakshatra and pada. Lahiri ayanamsa. Free, no sign-up.',
      heading: 'What is my Lagna?',
      lede: 'Your Lagna is the sign rising on the eastern horizon at your birth, in the Vedic zodiac. It is the first house of your Kundli. Enter your exact birth time and place to find it.',
      needsTime: true,
      about: {
        heading: 'The Lagna and your Kundli',
        paragraphs: [
          'In a Vedic birth chart the Lagna is the first house, and every other house follows from it. Two people born on the same day in the same city can have different Lagnas only a couple of hours apart.',
          'Because the Lagna changes about every two hours, an exact birth time matters. Lagna is calculated here with the Lahiri ayanamsa and whole-sign houses.',
        ],
      },
      faqs: [
        [
          'What is the difference between Lagna and Rashi?',
          'The Lagna is the rising sign at your birth and changes every couple of hours. The Rashi is the Moon’s sign and changes every two to three days. Both come from the same moment.',
        ],
        accuracy,
        privacy,
      ],
    },
    {
      slug: 'nakshatra',
      focus: 'nakshatra',
      label: 'Nakshatra calculator',
      title: 'Nakshatra Calculator: Find Your Birth Star and Pada | Mantrilo',
      description:
        'Find your birth Nakshatra (janma nakshatra), its pada and its lord from your birth date, time and place. Free Nakshatra calculator, no sign-up.',
      heading: 'What is my Nakshatra?',
      lede: 'Your birth Nakshatra, or birth star, is the lunar mansion the Moon was in when you were born. Enter your birth details to find it, with its pada and ruling planet.',
      needsTime: true,
      about: {
        heading: 'The 27 Nakshatras',
        paragraphs: [
          'The Vedic zodiac is divided into 27 Nakshatras of 13°20′ each, and each Nakshatra into four padas (quarters). The Moon passes through about one Nakshatra a day, so the birth time often decides which one is yours.',
          'Your Nakshatra’s lord sets the order of your Vimshottari Dasha periods, and its pada gives the traditional first syllable for a name. It is also central to Kundli matching.',
        ],
      },
      faqs: [
        [
          'Can I find my Nakshatra without a birth time?',
          'Only sometimes. The Moon spends about a day in each Nakshatra, so without a time the result may be one of two. The calculator uses midday and you should treat the result as a likely answer.',
        ],
        [
          'What is a pada?',
          'Each Nakshatra is split into four padas of 3°20′. The pada narrows down your Moon’s position and links it to a Navamsa (D9) sign.',
        ],
        privacy,
      ],
    },
  ] satisfies Omit<CalculatorPage, 'path'>[]
).map((page) => ({ ...page, path: `/calculators/${page.slug}` }));

export const calculatorHub = {
  path: '/calculators',
  label: 'Calculators',
  title: 'Free Astrology Sign Calculators: Western and Vedic | Mantrilo',
  description:
    'Free calculators for your Sun, Moon and Rising signs and your Vedic Rashi, Lagna and Nakshatra, from your birth date, time and place.',
};

export const calculatorSeoPages = Object.fromEntries([
  [
    calculatorHub.path,
    {
      title: calculatorHub.title,
      description: calculatorHub.description,
      label: calculatorHub.label,
      indexable: true,
    },
  ],
  ...calculatorPages.map((page) => [
    page.path,
    { title: page.title, description: page.description, label: page.label, indexable: true },
  ]),
]);
