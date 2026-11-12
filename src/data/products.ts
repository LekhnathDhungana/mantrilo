export const productPages = {
  'mantra-api': {
    label: 'MANTRA API',
    title: 'Sanskrit verses, with their context.',
    intro:
      'Add mantras to your app or website with one REST API. Records bring original Sanskrit together with transliteration, translation, word meanings, and source references where available.',
    status:
      'Access is currently by request. Fields can be empty on individual records, so ask for the titles, languages, and source details your product needs.',
    sections: [
      {
        title: 'Build a reading experience around the verse',
        copy: 'A developer can present original text first, offer transliteration alongside it, and show translation or meaning when those fields are available. Keep source context close to the text so readers can distinguish a verse from its explanation.',
      },
      {
        title: 'Treat optional fields as optional',
        copy: 'Mantra verses return sanskrit, transliteration, translation, and wordMeanings, and any of them can be null. Build your interface so a missing translation, source, or recording simply doesn’t appear.',
      },
      {
        title: 'Keep text and recordings connected',
        copy: 'A mantra with a recording includes an audio link in its response. Request the signed recording link through your server, and show a listening control only when that link is present.',
      },
      {
        title: 'Confirm provenance before commercial use',
        copy: 'A verse’s text, translation, and recording can each carry different rights. Ask for the source and translator details of the records you plan to use, and review the content license status before distribution.',
      },
    ],
    sample: 'mantra' as const,
    exampleTitle: 'A mantra response',
    workflow: [
      'Receive a selected text record through your server.',
      'Render original text and available transliteration or translation.',
      'Show a source reference and linked recording only when supplied.',
    ],
  },
  'sacred-audio-api': {
    label: 'SACRED AUDIO API',
    title: 'Connect the words to the listening experience.',
    intro:
      'Add sacred audio to devotional apps, learning products, and websites. Mantrilo links recordings to their mantras, so listening stays connected to the words.',
    status:
      'Recordings are delivered through signed links that last 15 minutes. They are available for mantras where a recording exists.',
    sections: [
      {
        title: 'A recording belongs with its content',
        copy: 'A mantra with a recording includes an audio link in its response. A reading view can reveal a listening control when that link is present and omit it when it isn’t.',
      },
      {
        title: 'Load audio when a visitor asks to listen',
        copy: 'Request the signed recording link from your server when someone chooses to listen. Each link counts the file’s size toward your monthly allowance, so avoid requesting links during page load.',
      },
      {
        title: 'Plan for monthly data delivery',
        copy: 'Audio allowances measure the data delivered, not file storage. The pricing page compares each plan’s monthly allowance. Recording length and how often people listen will affect delivery usage. Ask for recording coverage and formats when you request access.',
      },
      {
        title: 'Confirm recording-specific permissions',
        copy: 'Commercial use is subject to the documented content license. Confirm which recordings are available, how they may be distributed, and what source or performer information can be shown. The software license does not establish recording rights.',
      },
    ],
    sample: 'mantra' as const,
    exampleTitle: 'A mantra with its recording link',
    workflow: [
      'Check whether the displayed content has a recording.',
      'Request a signed link through your server.',
      'Start playback after user input and monitor delivered data.',
    ],
  },
  'shastra-books-api': {
    label: 'HINDU SCRIPTURE & SHASTRA BOOKS API',
    title: 'Build for the whole book. Or a single verse.',
    intro:
      'Browse Hindu scriptures by book, chapter, and verse. Build a reading experience that keeps each passage connected to its source.',
    status:
      'Book, chapter and verse endpoints are live. Filter the catalog by collection to call the Upanishads, the Bhagavad Gita and other sets directly.',
    sections: [
      {
        title: 'Give readers a path through a text',
        copy: 'A scripture reader can start at a book overview, move into a chapter, and show individual verses within that chapter. Preserve the book and chapter relationship when linking to a selected passage.',
      },
      {
        title: 'Respect the structure of the source',
        copy: 'Texts are organized into books, chapters, and verses where applicable. Check how a source edition is numbered before building navigation or verse references.',
      },
      {
        title: 'Handle missing translations and references',
        copy: 'A reading view should render available original text and display translation or commentary only when supplied. Any verse field can be null, so build the view to leave it out.',
      },
      {
        title: 'Review coverage and licensing by title',
        copy: 'Ask for the available books, source editions, language coverage, and content license during onboarding. Paid plans cover the full available catalog, but that does not establish availability or rights for any specific scripture or edition.',
      },
    ],
    sample: 'book' as const,
    exampleTitle: 'A collection page',
    workflow: [
      'List a collection with GET /v1/books?collection=upanishads.',
      'Open a book for its chapter index.',
      'Read a chapter page by page, following nextOffset.',
    ],
  },
};
export type ProductSlug = keyof typeof productPages;
