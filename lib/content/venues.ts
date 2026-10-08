import type { Localized } from "@/lib/i18n/config";

// 탁구 장소 — 기존 홈페이지(kttava.org)의 '탁구 장소' 내용을 옮겨 왔습니다.
// 글은 한국어(ko)와 영어(en)를 나란히 적습니다. 주소·홈페이지는 두 화면에 똑같이 나옵니다.

export type Venue = {
  name: Localized;
  /** 영문 이름이나 참가 조건 등 이름 아래에 붙는 한 줄 */
  subtitle?: Localized;
  hours?: Localized<string[]>;
  address: string;
  contact?: Localized;
  website?: string;
  note?: Localized;
};

export const venuesIntro: Localized = {
  ko: "북버지니아(Northern Virginia)와 워싱턴DC 인근에서 탁구 칠 수 있는 장소를 소개합니다.",
  en: "Places to play table tennis in Northern Virginia, near Washington, DC.",
};

export const venues: Venue[] = [
  {
    name: {
      ko: "와싱톤 중앙 장로 교회",
      en: "Korean Central Presbyterian Church (KCPC)",
    },
    subtitle: {
      ko: "Korean Central Presbyterian Church (중장 탁구 회원만 참석 가능)",
      en: "Open to KCPC table tennis club members only",
    },
    hours: {
      ko: ["화요일 7:30 PM - 10:00 PM"],
      en: ["Tuesdays, 7:30 – 10:00 PM"],
    },
    address: "15451 Lee Hwy, Centreville, VA",
    contact: {
      ko: "기성환 총무 (카톡: kish1919)",
      en: "Danny (Sunghwan) Ki, General Secretary (KakaoTalk: kish1919)",
    },
    website: "http://kcpc.org/",
  },
  {
    name: {
      ko: "성 바오로 정하상 천주교회",
      en: "St. Paul Chung Catholic Church",
    },
    subtitle: {
      ko: "St. Paul Chung Catholic Church (성당 탁구 회원만 참석 가능)",
      en: "Open to the parish table tennis club members only",
    },
    hours: {
      ko: ["토요일 4:00 PM - 7:00 PM"],
      en: ["Saturdays, 4:00 – 7:00 PM"],
    },
    address: "4712 Rippling Pond Dr, Fairfax, VA",
    contact: {
      ko: "벤 리 부회장 (703-627-0637)",
      en: "Ben Lee, Vice President (703-627-0637)",
    },
    website: "https://stpaulchung.org/",
  },
  {
    name: {
      ko: "워싱톤 메시야 장로교회",
      en: "Messiah Presbyterian Church of Washington",
    },
    subtitle: {
      ko: "Messiah Presbyterian Church of Washington",
      en: "",
    },
    hours: {
      ko: ["금요일 4:00 PM - 7:00 PM"],
      en: ["Fridays, 4:00 – 7:00 PM"],
    },
    address: "4313 Markham St, Annandale, VA",
    contact: {
      ko: "토마스 리 (카톡: Thomas Lee)",
      en: "Thomas Lee (KakaoTalk: Thomas Lee)",
    },
    website: "http://www.mpcow.org/",
  },
  {
    name: { ko: "링코니아", en: "Lincolnia Senior Center" },
    subtitle: {
      ko: "Lincolnia Senior Center (시니어 회원 모임)",
      en: "Senior members' group",
    },
    hours: {
      ko: ["월요일 - 금요일 8:00 AM - 4:00 PM"],
      en: ["Monday – Friday, 8:00 AM – 4:00 PM"],
    },
    address: "4710 Chambliss St. Alexandria, VA",
    contact: {
      ko: "시간 및 참가 문의: 구옥남 총무 (카톡: 구옥남)",
      en: "Hours and participation: Oknam Koo, Secretary (KakaoTalk: 구옥남)",
    },
  },
  {
    name: { ko: "한사랑 탁구", en: "Hansarang Table Tennis" },
    subtitle: { ko: "시니어 회원 모임", en: "Senior members' group" },
    address: "6131 Wilston Dr. Falls Church, VA",
    contact: {
      ko: "시간 및 참가 문의: 이경호 총무 (카톡: 이경호)",
      en: "Hours and participation: Kyungho Lee, Secretary (KakaoTalk: 이경호)",
    },
  },
  {
    name: {
      ko: "Royal Badminton & Table Tennis Academy",
      en: "Royal Badminton & Table Tennis Academy",
    },
    hours: { ko: ["매일 상시 오픈"], en: ["Open daily"] },
    address: "21598 Atlantic Blvd Suite # 100, Sterling, VA 20166",
    contact: {
      ko: "(202) 569-2008 Ask for Josh, Manager",
      en: "(202) 569-2008 — ask for Josh, Manager",
    },
    website: "https://royalbadmintonacademy.com/",
    note: {
      ko: "배드민턴 장소로 유명한 곳입니다. 탁구 테이블이 8개 있습니다. 테이블 2개는 이층에 항시 셑업 되있고 아래층은 배드민턴과 같이 사용하고 있습니다. 일요일엔 4:30 부터 리그전을하고 있습니다. 하루 사용료 $12",
      en: "Best known for badminton, with eight table tennis tables. Two are permanently set up upstairs; the downstairs tables share the floor with badminton. League play runs on Sundays from 4:30. Day pass: $12.",
    },
  },
  {
    name: {
      ko: "Jim Scott (formerly Providence) Community Center",
      en: "Jim Scott (formerly Providence) Community Center",
    },
    hours: {
      ko: ["월요일 - 토요일 9:00 AM - 10:00 PM"],
      en: ["Monday – Saturday, 9:00 AM – 10:00 PM"],
    },
    address: "3001 Vaden Drive, Fairfax, VA, 22031",
    contact: { ko: "(703) 865-0520", en: "(703) 865-0520" },
    website:
      "https://www.fairfaxcounty.gov/neighborhood-community-services/jim-scott-community-center",
    note: {
      ko: "매년 Fairfax County Senior Olympics 탁구 부분을 수용하고 있는 장소입니다. 일층 오른편 방에 탁구대 2대가 항시 놓여있습니다. 탁구대 규격도 훌륭하고 탁구 치기에 충분한 공간이 있습니다.",
      en: "Hosts the table tennis events of the Fairfax County Senior Olympics each year. Two tables are always set up in the room on the right side of the first floor. The tables are regulation quality, with plenty of room to play.",
    },
  },
  {
    name: { ko: "Gunston Community Center", en: "Gunston Community Center" },
    hours: {
      ko: ["Sunday: Closed", "Monday - Friday: 6 p.m. - 9 p.m.", "Saturday: 9 a.m. - 5 p.m."],
      en: ["Monday – Friday, 6:00 – 9:00 PM", "Saturday, 9:00 AM – 5:00 PM", "Sunday, closed"],
    },
    address: "2700 S. Lang Street, Arlington, VA 22206",
    contact: { ko: "(703) 228-6980", en: "(703) 228-6980" },
    website:
      "https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Indoor-Facilities/Gunston-Community-Center",
    note: {
      ko: "상급자들이 많이 모이는 곳입니다.",
      en: "Popular with advanced players.",
    },
  },
  {
    name: {
      ko: "Falls Church Community Center",
      en: "Falls Church Community Center",
    },
    hours: {
      ko: [
        "월요일 - 목요일 8:00 AM - 10:00 PM",
        "금요일 8:00 AM - 11:00 PM",
        "토요일 8:30 AM - 11:00 PM",
        "일요일 2:00 PM - 6:00 PM",
      ],
      en: [
        "Monday – Thursday, 8:00 AM – 10:00 PM",
        "Friday, 8:00 AM – 11:00 PM",
        "Saturday, 8:30 AM – 11:00 PM",
        "Sunday, 2:00 – 6:00 PM",
      ],
    },
    address: "223 Little Falls St, Falls Church, VA 22046",
    contact: { ko: "(703) 248-5077", en: "(703) 248-5077" },
    website: "https://fallschurchva.gov/508/Community-Center",
    note: {
      ko: "입구에서 왼쪽으로 들어가면 vending machine 앞에 방이 있습니다. 탁구 테이블 2개와 pool table 이 있습니다. 탁구대는 표준 이하이고 앞뒤로 공간이 협소한 편입니다.",
      en: "From the entrance, head left to the room by the vending machines. It has two table tennis tables and a pool table. The tables are below regulation standard, and space behind each end is tight.",
    },
  },
];
