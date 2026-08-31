export const en = {
  common: {
    loading: 'Loading…',
    retry: 'Retry',
    close: 'Close',
    error: 'Something went wrong',
  },
  nav: {
    home: 'Home',
    products: 'Products',
    company: 'Company',
    careers: 'Careers',
    contact: 'Contact',
    liveDemo: 'Live demo',
  },
  connection: {
    idle: 'Ready',
    connecting: 'Connecting…',
    open: 'Live',
    reconnecting: 'Reconnecting… (attempt {attempt})',
    closed: 'Disconnected',
  },
  caption: {
    language: 'Language',
    fontSize: 'Font size',
    autoScroll: 'Auto-scroll',
    paused: 'Paused — new captions are waiting',
    resume: 'Resume',
    sessionEnded: 'The session has ended',
  },
  conversation: {
    inputPlaceholder: 'Type your message…',
    send: 'Send',
    staff: 'Staff',
    patient: 'Patient',
    typing: '{role} is typing…',
  },
  product: {
    symposia: {
      name: 'Symposia',
      tagline: 'Every talk, in every attendee’s language — live.',
    },
    careTalk: {
      name: 'CareTalk',
      tagline: 'Two-way medical interpretation between staff and patients.',
    },
  },
  company: {
    name: 'TheGame',
    mission: 'Removing language barriers from global medical communication.',
  },
} as const

export type Resources = typeof en
