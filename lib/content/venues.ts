// 탁구 장소 — 기존 홈페이지(kttava.org)의 '탁구 장소' 내용을 옮겨 왔습니다.

export type Venue = {
  name: string;
  /** 영문 이름이나 참가 조건 등 이름 아래에 붙는 한 줄 */
  subtitle?: string;
  hours?: string[];
  address: string;
  contact?: string;
  website?: string;
  note?: string;
};

export const venuesIntro =
  "Northern Virginia 에서 탁구 칠 수 있는 장소를 소개합니다.";

export const venues: Venue[] = [
  {
    name: "와싱톤 중앙 장로 교회",
    subtitle: "Korean Central Presbyterian Church (중장 탁구 회원만 참석 가능)",
    hours: ["화요일 7:30 PM - 10:00 PM"],
    address: "15451 Lee Hwy, Centreville, VA",
    contact: "기성환 총무 (카톡: kish1919)",
    website: "http://kcpc.org/",
  },
  {
    name: "성 바오로 정하상 천주교회",
    subtitle: "St. Paul Chung Catholic Church (성당 탁구 회원만 참석 가능)",
    hours: ["토요일 4:00 PM - 7:00 PM"],
    address: "4712 Rippling Pond Dr, Fairfax, VA",
    contact: "벤 리 부회장 (703-627-0637)",
    website: "https://stpaulchung.org/",
  },
  {
    name: "워싱톤 메시야 장로교회",
    subtitle: "Messiah Presbyterian Church of Washington",
    hours: ["금요일 4:00 PM - 7:00 PM"],
    address: "4313 Markham St, Annandale, VA",
    contact: "토마스 리 (카톡: Thomas Lee)",
    website: "http://www.mpcow.org/",
  },
  {
    name: "링코니아",
    subtitle: "Lincolnia Senior Center (시니어 회원 모임)",
    hours: ["월요일 - 금요일 8:00 AM - 4:00 PM"],
    address: "4710 Chambliss St. Alexandria, VA",
    contact: "시간 및 참가 문의: 구옥남 총무 (카톡: 구옥남)",
  },
  {
    name: "한사랑 탁구",
    subtitle: "시니어 회원 모임",
    address: "6131 Wilston Dr. Falls Church, VA",
    contact: "시간 및 참가 문의: 이경호 총무 (카톡: 이경호)",
  },
  {
    name: "Royal Badminton & Table Tennis Academy",
    hours: ["매일 상시 오픈"],
    address: "21598 Atlantic Blvd Suite # 100, Sterling, VA 20166",
    contact: "(202) 569-2008 Ask for Josh, Manager",
    website: "https://royalbadmintonacademy.com/",
    note: "배드민턴 장소로 유명한 곳입니다. 탁구 테이블이 8개 있습니다. 테이블 2개는 이층에 항시 셑업 되있고 아래층은 배드민턴과 같이 사용하고 있습니다. 일요일엔 4:30 부터 리그전을하고 있습니다. 하루 사용료 $12",
  },
  {
    name: "Jim Scott (formerly Providence) Community Center",
    hours: ["월요일 - 토요일 9:00 AM - 10:00 PM"],
    address: "3001 Vaden Drive, Fairfax, VA, 22031",
    contact: "(703) 865-0520",
    website:
      "https://www.fairfaxcounty.gov/neighborhood-community-services/jim-scott-community-center",
    note: "매년 Fairfax County Senior Olympics 탁구 부분을 수용하고 있는 장소입니다. 일층 오른편 방에 탁구대 2대가 항시 놓여있습니다. 탁구대 규격도 훌륭하고 탁구 치기에 충분한 공간이 있습니다.",
  },
  {
    name: "Gunston Community Center",
    hours: [
      "Sunday: Closed",
      "Monday - Friday: 6 p.m. - 9 p.m.",
      "Saturday: 9 a.m. - 5 p.m.",
    ],
    address: "2700 S. Lang Street, Arlington, VA 22206",
    contact: "(703) 228-6980",
    website:
      "https://www.arlingtonva.us/Government/Departments/Parks-Recreation/Locations/Indoor-Facilities/Gunston-Community-Center",
    note: "상급자들이 많이 모이는 곳입니다.",
  },
  {
    name: "Falls Church Community Center",
    hours: [
      "월요일 - 목요일 8:00 AM - 10:00 PM",
      "금요일 8:00 AM - 11:00 PM",
      "토요일 8:30 AM - 11:00 PM",
      "일요일 2:00 PM - 6:00 PM",
    ],
    address: "223 Little Falls St, Falls Church, VA 22046",
    contact: "(703) 248-5077",
    website: "https://fallschurchva.gov/508/Community-Center",
    note: "입구에서 왼쪽으로 들어가면 vending machine 앞에 방이 있습니다. 탁구 테이블 2개와 pool table 이 있습니다. 탁구대는 표준 이하이고 앞뒤로 공간이 협소한 편입니다.",
  },
];
