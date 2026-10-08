import { endDateOf } from "@/lib/dates";
import { localePath, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { site, siteUrl } from "@/lib/site";
import type { Tournament } from "@/lib/types";

// 검색 사이트가 읽는 구조화 데이터(JSON-LD). 화면에는 보이지 않고 `components/JsonLd.tsx` 로 페이지에 넣습니다.
// Google 은 이 내용으로 협회 이름·로고를 알아보고, 대회는 검색 결과에 일정으로 보여 주기도 합니다.

/** 언어 표시가 없는 주소("/about")를 검색 사이트에 알려 줄 전체 주소로 바꿉니다. */
function absolute(lang: Locale, path: string) {
  const localized = localePath(lang, path);
  return `${siteUrl()}${localized === "/" ? "" : localized}`;
}

/**
 * 사람들이 협회를 찾을 때 쓰는 다른 이름들. 신문 기사와 재미대한탁구협회 홈페이지에 실제로 쓰인 표기만 넣습니다.
 * (검색 사이트가 이 이름으로 찾아도 같은 협회임을 알게 됩니다)
 */
const ALTERNATE_NAMES = [
  site.name,
  site.nameKo,
  site.nameEn,
  "워싱턴DC 탁구협회",
  "워싱턴 한인탁구협회",
  "DC·버지니아 한인탁구협회",
];

/** 홈 화면에 넣는 협회와 홈페이지 정보 */
export function siteJsonLd(lang: Locale) {
  const base = siteUrl();
  const d = getDictionary(lang);
  const name = d.site.fullName;
  const organization = {
    "@type": "SportsOrganization",
    "@id": `${base}/#organization`,
    name,
    alternateName: ALTERNATE_NAMES.filter((other) => other !== name),
    url: absolute(lang, "/"),
    logo: `${base}/images/logo.png`,
    image: `${base}/opengraph-image.jpg`,
    description: site.description[lang],
    slogan: site.slogan,
    email: site.email,
    sport: "Table Tennis",
    areaServed: [
      { "@type": "State", name: "Virginia" },
      { "@type": "City", name: "Washington, D.C." },
    ],
  };
  const website = {
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: absolute(lang, "/"),
    name,
    alternateName: [site.name, d.site.otherName],
    inLanguage: lang,
    publisher: { "@id": organization["@id"] },
  };
  return { "@context": "https://schema.org", "@graph": [organization, website] };
}

/**
 * 대회 상세 페이지에 넣는 대회 정보. 장소가 적혀 있지 않은 대회는 검색 사이트가 받아 주지 않으므로 null 입니다.
 * tournament 는 보여 줄 언어로 바꾼(localizeTournament) 것을 넘깁니다.
 */
export function tournamentJsonLd(tournament: Tournament, lang: Locale) {
  const place = tournament.venue || tournament.address;
  if (!place) return null;

  const base = siteUrl();
  const end = endDateOf(tournament);
  // 다른 주에서 열리는 대회도 있어 시간대는 적지 않습니다. 그러면 검색 사이트가 대회 장소의 현지 시각으로 읽습니다.
  const at = (date: string, time?: string) => (time ? `${date}T${time}:00` : date);
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: tournament.title,
    sport: "Table Tennis",
    url: absolute(lang, `/tournaments/${tournament.id}`),
    inLanguage: lang,
    startDate: at(tournament.startDate, tournament.startTime),
    // 끝나는 시각만 없으면 날짜만 적습니다. 하루짜리 대회에 시각이 없으면 시작과 같아 적지 않습니다.
    ...(tournament.endTime || end !== tournament.startDate
      ? { endDate: at(end, tournament.endTime) }
      : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: place,
      address: tournament.address || place,
    },
    ...(tournament.summary ? { description: tournament.summary } : {}),
    ...(tournament.images.length > 0
      ? { image: tournament.images.map((image) => new URL(image.src, base).href) }
      : {}),
    // 다른 협회가 여는 대회도 안내하므로, 주최가 적혀 있지 않으면 비워 둡니다.
    ...(tournament.organizer
      ? { organizer: { "@type": "Organization", name: tournament.organizer } }
      : {}),
  };
}
