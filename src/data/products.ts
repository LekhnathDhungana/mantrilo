export const productPages = {
  'mantra-api': {
    label: 'MANTRA API',
    title: 'Sanskrit Mantra and Shloka API',
    intro:
      'Add mantras to your app or website with one REST API. Records bring original Sanskrit together with transliteration and source references where available.',
    status:
      'Create a free sandbox key to try sample mantras. Fields can be empty on individual records, so check the titles, languages and source details your app needs.',
    sections: [
      {
        title: 'Build a reading experience around the verse',
        copy: 'A developer can present original text first, offer transliteration alongside it, and add a translation they have permission to distribute. Keep source context close to the text so readers can distinguish a verse from its explanation.',
      },
      {
        title: 'Treat optional fields as optional',
        copy: 'Mantra verses return Sanskrit and transliteration where available. Translation is null and wordMeanings is empty. Hide missing fields in your app.',
      },
      {
        title: 'Keep text and recordings connected',
        copy: 'A mantra with a recording includes an audio link in its response. Request the signed recording link through your server, and show a listening control only when that link is present.',
      },
      {
        title: 'Licensed for your product',
        copy: 'Paid plans include a license to use the verses and recordings in your app. Keep source references with the text, and see the content license for what it covers.',
      },
    ],
    sample: 'mantra' as const,
    exampleTitle: 'A mantra response',
    workflow: [
      'Receive a selected text record through your server.',
      'Render original text and available transliteration.',
      'Show a source reference and linked recording only when supplied.',
    ],
  },
  'sacred-audio-api': {
    label: 'SACRED AUDIO API',
    title: 'Mantra Recording API',
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
        copy: 'Audio allowances measure the data delivered, not file storage. The pricing page compares each plan’s monthly allowance. Recording length and how often people listen will affect delivery usage. Ask us about recording coverage and formats.',
      },
      {
        title: 'Recordings licensed for your app',
        copy: 'Paid plans include a license to play the recordings to your users through the API. To bundle recordings in your app for offline listening, purchase a content license.',
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
  'books-api': {
    label: 'BOOKS API',
    title: 'Books API',
    intro:
      'Add Hindu scriptures and English retellings of the Ramayana and Mahabharata to your app. Browse books by collection and read chapters with source references.',
    status:
      'Browse the catalog by collection. The sandbox shows sample titles and opening verses; a live key can access the full available catalog.',
    sections: [
      {
        title: 'Give readers a path through a text',
        copy: 'A scripture reader can start at a book overview, move into a chapter, and show individual verses within that chapter. Preserve the book and chapter relationship when linking to a selected passage.',
      },
      {
        title: 'Ramayana and Mahabharata retellings',
        copy: 'A live key can read all 22 Ramayana chapters and 62 Mahabharata chapters. Each chapter returns a source reference and ordered prose sections with paragraphs.',
      },
      {
        title: 'Handle missing translations and references',
        copy: 'A reading view should render available original text and display translation or commentary only when supplied. Any verse field can be null, so build the view to leave it out.',
      },
      {
        title: 'Review coverage and licensing by title',
        copy: 'Start with the Bhagavad Gita and Isha Upanishad in the sandbox. Browse the Library for previews and check the content license before publishing material in an app.',
      },
    ],
    sample: 'book' as const,
    exampleTitle: 'A collection page',
    workflow: [
      'List a collection with GET /v1/books?collection=upanishads.',
      'Open a book for its chapter index.',
      'Render the sections of a prose chapter or follow nextOffset to page through verses.',
    ],
  },
};
export type ProductSlug = keyof typeof productPages;
