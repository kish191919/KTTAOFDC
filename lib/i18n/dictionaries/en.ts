import type { Dictionary } from "./ko";

// 영어 화면 문구. ko.ts 와 같은 자리에 같은 뜻의 문구를 넣습니다.
// 한국어를 그대로 옮기기보다, 영어권 방문자가 읽기 편하도록 짧고 정중하게 씁니다.

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const en: Dictionary = {
  site: {
    fullName: "Korean Table Tennis Association of DC",
    logoLines: ["Korean Table Tennis", "Association of DC"],
    otherName: "워싱턴DC 한인탁구협회",
    homeLabel: "KTTA of DC — Korean Table Tennis Association of DC, home",
    keywords: [
      "KTTA of DC",
      "Korean Table Tennis Association of DC",
      "table tennis Northern Virginia",
      "table tennis Washington DC",
      "Korean American table tennis",
      "table tennis tournaments",
    ],
    rssTitle: "KTTA of DC tournament news (Korean)",
  },

  nav: {
    main: "Main menu",
    mobile: "Mobile menu",
    open: "Open menu",
    close: "Close menu",
    quickLinks: "Quick links",
    admin: "Admin",
  },

  contact: {
    title: "Contact Us",
    description: "Questions? Send us an email.",
    copy: "Copy email address",
    copied: "Address copied",
    gmail: "Send with Gmail",
    mailApp: "Open mail app",
    mailAppHint:
      "If nothing opened, no mail app is set up on this device. Please copy the address or use Gmail.",
    close: "Close",
  },

  home: {
    bannerAlt:
      "KTTA of DC — Korean Table Tennis Association of DC. Table Tennis Builds a Better Community",
    welcomeEyebrow: "Welcome",
    aboutLink: "About the association",
    tournamentsEyebrow: "Events",
    tournamentsTitle: "Tournaments",
    tournamentsDescription: "Upcoming events and recent results.",
    tournamentsEmpty: "No tournaments have been posted yet. New events will appear here.",
    tournamentsLink: "View all tournaments",
    galleryEyebrow: "Gallery",
    galleryTitle: "In Action",
    galleryDescription: "Moments from our tournaments and gatherings.",
    galleryLink: "View the full gallery",
    joinTitle: "Come Play with Us",
    joinDescription: "Find a place to play near you, or reach out with any questions.",
    venuesLink: "Where to play",
    emailLink: "Email us",
  },

  about: {
    eyebrow: "KTTA of DC",
    title: "About Us",
    metaDescription:
      "Meet the Korean Table Tennis Association of DC: a message from our president, our leadership team, and our bylaws.",
    greetingEyebrow: "Welcome",
    greetingTitle: "A Message from the President",
    leadershipEyebrow: "Our Team",
    leadershipTitle: "Leadership",
    term: (years) => `Term: ${years}`,
    bylawsTitle: "Bylaws",
    bylawsDescription:
      "Our bylaws set out the association's purpose and how it is run. The document is in Korean and English.",
    bylawsLink: "View the bylaws (PDF)",
  },

  tournaments: {
    eyebrow: "Events",
    title: "Tournaments",
    metaDescription:
      "Tournament schedules and entry details from the Korean Table Tennis Association of DC.",
    description: "Schedules and entry details for tournaments we host or attend together.",
    upcoming: "Upcoming",
    count: (n) => plural(n, "event", "events"),
    upcomingEmpty: "No tournaments are scheduled right now. New events will be posted here.",
    past: "Past Tournaments",
    year: (year) => String(year),
    cardLink: "Details",
    back: "Tournaments",
    infoTitle: "Event Info",
    schedule: "Date & Time",
    venue: "Venue",
    organizer: "Organizer",
    fee: "Entry Fee",
    deadline: "Entry Deadline",
    contact: "Contact",
    openLink: "Open link",
    map: "View on map",
    calendar: "Add to Google Calendar",
    bodyTitle: "Overview",
    posterTitle: "Poster",
    fullTextTitle: "Tournament Details",
    fullTextHint: "An English summary of the poster and attached files.",
    fullTextFallbackTitle: "Full Details (Korean)",
    fullTextFallbackHint:
      "Transcribed from the poster and attached files. An English summary is not yet available.",
    attachments: "Attachments",
    noDetails: "Full details will be posted here as soon as they are available.",
    more: "Back to all tournaments",
  },

  gallery: {
    eyebrow: "Photos",
    title: "Gallery",
    metaDescription: "Photos from KTTA of DC tournaments and gatherings.",
    description: "Moments from our tournaments and gatherings.",
    emptyTitle: "Photos coming soon",
    emptyDescription: "Event photos will appear here, organized by album.",
    year: (year) => String(year),
    photoCount: (n) => plural(n, "photo", "photos"),
    cardLink: "View photos",
    back: "Gallery",
    noPhotos: "No photos have been added yet.",
    more: "Back to all albums",
    download: "Download photos",
    downloadHint: "Tap the photos you want to download.",
    selected: (n) => `${n} selected`,
    selectAll: "Select all",
    deselectAll: "Deselect all",
    downloadStart: "Download",
    preparing: (done, total) => `Preparing… (${done}/${total})`,
    cancel: "Cancel",
    partialFailure: (n) =>
      `${plural(n, "photo", "photos")} could not be retrieved; the rest were downloaded.`,
    downloadFailure: "The download failed. Please try again shortly.",
    photoAlt: (title, n) => `${title} — photo ${n}`,
    photoSelect: (title, n) => `Select photo ${n} of ${title}`,
    photoEnlarge: (title, n) => `Enlarge photo ${n} of ${title}`,
  },

  community: {
    eyebrow: "Community",
    tabsLabel: "Community sections",
    news: "News",
    venues: "Where to Play",
    etiquette: "Etiquette",
  },

  news: {
    metaDescription: "Press coverage of the association and updates for our members.",
    description: "Press coverage of the association and updates for our members.",
    emptyTitle: "News coming soon",
    emptyDescription: "Press articles and member notices will appear here.",
    original: "Read the original article",
    openLink: "Open link",
    attachments: "Attachments",
    more: "Back to all news",
  },

  venues: {
    metaDescription:
      "Places to play table tennis in Northern Virginia, with hours and contact details.",
    hours: "Hours",
    address: "Address",
    contact: "Contact",
    website: "Website",
  },

  etiquette: {
    metaDescription: "Courtesies that keep table tennis enjoyable for everyone at the club.",
    description: (total) => `${total} courtesies that keep the game enjoyable for everyone.`,
  },

  viewer: {
    dialog: (label) => `${label} — enlarged image`,
    alt: (label, n) => `${label} — image ${n}`,
    enlarge: (label, n) => `Enlarge image ${n} of ${label}`,
    close: "Close",
    previous: "Previous image",
    next: "Next image",
  },

  hero: {
    label: "Featured media",
    previous: "Previous slide",
    next: "Next slide",
    slide: (n) => `Slide ${n}`,
    unmute: "Unmute",
    mute: "Mute",
  },

  notFound: {
    title: "Page Not Found",
    description: "This page may have been moved or removed.",
    home: "Go to home",
    tournaments: "View tournaments",
  },

  langToggle: {
    label: "한국어로 보기",
    short: "한국어",
  },
};
