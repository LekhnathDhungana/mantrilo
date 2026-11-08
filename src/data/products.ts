export const productPages = {
  'mantra-shloka-api': {
    label: 'MANTRA & SHLOKA API',
    title: 'Sanskrit verses, with their context.',
    intro:
      'Plan a mantra or shloka integration for your app or website. Mantrilo’s content model brings original text together with transliteration, translation, meaning, and source references where available.',
    status:
      'The website currently contains illustrative fixtures, not a connected catalog. No specific mantra, shloka, language coverage, or source edition has been verified.',
    sections: [
      {
        title: 'Build a reading experience around the verse',
        copy: 'A developer can present original text first, offer transliteration alongside it, and show translation or meaning when those fields are available. Keep source context close to the text so readers can distinguish a verse from its explanation.',
      },
      {
        title: 'Treat optional fields as optional',
        copy: 'The illustrative text fixture separates original_text, transliteration, translation, meaning, source_reference, and audio_id. A translation, source reference, or recording should not be assumed to exist for every record. Confirm the real schema and coverage before implementing an interface.',
      },
      {
        title: 'Keep text and recordings connected',
        copy: 'A linked audio identifier can connect a verse view to a listening experience. Resolve the relationship through your server once production endpoints are documented, and display a listening control only when a recording is actually available.',
      },
      {
        title: 'Confirm provenance before commercial use',
        copy: 'A verified title list, translators, source editions, and content-specific rights still need to be confirmed. Request that information during onboarding and review the documented content license before distribution.',
      },
    ],
    sample: 'mantra' as const,
    exampleTitle: 'Illustrative text-record structure',
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
      'Plan sacred-audio integration for devotional apps, learning products, and websites. Mantrilo’s proposed structure links recordings to relevant content rather than treating audio as an isolated file.',
    status:
      'No recording or live audio-delivery endpoint is connected. This page explains a metadata model and integration workflow; it does not offer playable sample audio.',
    sections: [
      {
        title: 'A recording belongs with its content',
        copy: 'Use a content identifier to associate a recording with the mantra or shloka being displayed. A reading view can reveal a listening control when a recording is present and omit it when none is available.',
      },
      {
        title: 'Load audio when a visitor asks to listen',
        copy: 'Resolve the authorized recording URL on your server and let the user initiate playback. Avoid fetching a full recording during initial page load. The current marketing preview shows a waveform illustration and metadata, without downloading any audio.',
      },
      {
        title: 'Plan for monthly data delivery',
        copy: 'Audio allowances measure the data delivered, not file storage. The pricing page compares each plan’s monthly allowance. Recording length, encoding, and listening frequency will affect delivery usage; no bitrate, file format, or recording coverage has been confirmed.',
      },
      {
        title: 'Confirm recording-specific permissions',
        copy: 'Commercial use is subject to the documented content license. Confirm which recordings are available, how they may be distributed, and what source or performer information can be shown. The software license does not establish recording rights.',
      },
    ],
    sample: 'audio' as const,
    exampleTitle: 'Illustrative linked-recording structure',
    workflow: [
      'Check whether the displayed content has a recording.',
      'Resolve an authorized delivery URL through your server.',
      'Start playback after user input and monitor delivered data.',
    ],
  },
  'shastra-books-api': {
    label: 'HINDU SCRIPTURE & SHASTRA BOOKS API',
    title: 'Build for the whole book. Or a single verse.',
    intro:
      'Plan a Hindu scripture or religious-book integration around structured reading. Mantrilo’s book model organizes texts into books, chapters, and verses where applicable, so your product can keep reading context intact.',
    status:
      'No book titles, editions, translations, or complete scriptures have been verified for this preview. The book structure below is a placeholder fixture, not an available catalog entry.',
    sections: [
      {
        title: 'Give readers a path through a text',
        copy: 'A scripture reader can start at a book overview, move into a chapter, and show individual verses within that chapter. Preserve the book and chapter relationship when linking to a selected passage.',
      },
      {
        title: 'Respect the structure of the source',
        copy: 'Not every text uses the same divisions. The proposed model supports books, chapters, and verses where applicable; it does not establish a universal numbering system. Confirm how a source edition is represented before building navigation or verse references.',
      },
      {
        title: 'Handle missing translations and references',
        copy: 'A reading view should render available original text and display translation or source references only when supplied. A null field in the fixture illustrates missing data, not a claim that the production catalog has been audited.',
      },
      {
        title: 'Review coverage and licensing by title',
        copy: 'Ask for the available books, source editions, language coverage, and content license during onboarding. Paid plans cover the full available catalog, but that does not establish availability or rights for any specific scripture or edition.',
      },
    ],
    sample: 'book' as const,
    exampleTitle: 'Illustrative book, chapter, and verse structure',
    workflow: [
      'Select a book from the confirmed catalog.',
      'Render the supplied chapter and verse organization.',
      'Keep the source context visible when linking to a passage.',
    ],
  },
};
export type ProductSlug = keyof typeof productPages;
