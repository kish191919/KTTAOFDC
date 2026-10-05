// 탁구 에티켓 — 기존 홈페이지(kttava.org)의 30개 항목을 주제별로 묶고 문장을 다듬은 목록입니다.
export type EtiquetteItem = { title: string; ko: string; en: string };

export type EtiquetteGroup = {
  /** 바로가기 주소(#id)로 쓰는 영문 이름 */
  id: string;
  title: string;
  titleEn: string;
  items: EtiquetteItem[];
};

export const etiquetteGroups: EtiquetteGroup[] = [
  {
    id: "greeting",
    title: "인사와 예의",
    titleEn: "Greetings & Respect",
    items: [
      {
        title: "먼저 인사하기",
        ko: "나이와 실력에 상관없이 먼저 인사하고, 치기 전에도 서로 인사합니다.",
        en: "Greet others first, whatever their age or level, and greet your opponent before you play.",
      },
      {
        title: "존댓말로 시작하고 인사로 마무리",
        ko: "처음부터 반말하지 않고, 연장자께 예의를 갖추며, 끝나면 인사합니다.",
        en: "Speak politely from the start, show respect to elders, and say thank you when you finish.",
      },
      {
        title: "네트·에지에는 미안함 표시",
        ko: "시합 중 공이 네트나 에지(edge)에 맞았을 때는 가볍게 인사합니다.",
        en: "When the ball clips the net or the edge, acknowledge it with a quick \"Sorry.\"",
      },
      {
        title: "열심히 치고 칭찬하기",
        ko: "경기는 성의껏 하고, 상대의 멋진 플레이에는 칭찬을 건넵니다.",
        en: "Play your best and compliment your opponent's good shots.",
      },
      {
        title: "공 주우러 함께 가기",
        ko: "상대가 공을 주우러 갈 때 중간까지라도 따라갑니다.",
        en: "When your opponent goes to fetch the ball, walk at least partway with them.",
      },
    ],
  },
  {
    id: "practice",
    title: "준비와 연습",
    titleEn: "Getting Ready & Practice",
    items: [
      {
        title: "운동복과 탁구화 갖추기",
        ko: "운동복과 탁구화를 갖추고 운동합니다.",
        en: "Wear proper sportswear and table tennis shoes.",
      },
      {
        title: "공은 내가 먼저 준비",
        ko: "탁구공은 내가 먼저 준비합니다.",
        en: "Have a ball ready before you play.",
      },
      {
        title: "타월 챙기고 땀 닦기",
        ko: "타월을 꼭 가지고 다니며, 탁구대나 바닥에 떨어진 자기 땀은 직접 닦습니다.",
        en: "Always carry a towel and wipe your own sweat off the table and floor.",
      },
      {
        title: "몸 풀 때는 부드럽게",
        ko: "몸을 풀 때 강타를 하거나 갑자기 백 쪽으로 보내지 않습니다.",
        en: "During warm-up, don't smash or suddenly switch to the backhand side.",
      },
      {
        title: "어려운 서브는 적당히",
        ko: "시합이 아닐 때는 상대가 받기 힘들어하는 서브를 너무 많이 넣지 않습니다.",
        en: "Outside of matches, don't overuse serves your opponent struggles to return.",
      },
      {
        title: "봐주는 서브 하지 않기",
        ko: "봐주는 듯한 힘없는 서브는 넣지 않습니다.",
        en: "Don't give weak serves that look like you're going easy.",
      },
    ],
  },
  {
    id: "fair-play",
    title: "공정한 경기",
    titleEn: "Fair Play",
    items: [
      {
        title: "서브 규정 지키기",
        ko: "공을 16cm 이상 띄우고, 오픈 서브를 지킵니다.",
        en: "Follow the service rules: toss the ball at least 16 cm (about 6 in.) and keep it visible.",
      },
      {
        title: "상대가 준비된 뒤에 치기",
        ko: "상대방이 자세를 잡기 전에는 치지 않습니다.",
        en: "Don't serve until your opponent is ready.",
      },
      {
        title: "우기지 않기",
        ko: "네트가 아닌데 네트라고 하는 등 서로 우기지 않습니다.",
        en: "Don't argue over calls, such as claiming a net that wasn't.",
      },
      {
        title: "우롱하는 플레이 하지 않기",
        ko: "상대를 우롱하는 듯한 플레이는 하지 않습니다.",
        en: "Don't play in a way that mocks your opponent.",
      },
      {
        title: "현혹하는 동작 하지 않기",
        ko: "라켓을 정신없이 흔드는 등 상대를 현혹하는 동작은 피합니다.",
        en: "Avoid distracting moves such as waving your racket wildly.",
      },
    ],
  },
  {
    id: "focus",
    title: "말과 집중",
    titleEn: "Words & Focus",
    items: [
      {
        title: "상대 실력을 깎아내리지 않기",
        ko: "상대의 플레이를 평가절하하거나 약하다고 하는 등 자기 잣대로 말하지 않습니다.",
        en: "Don't belittle your opponent's play or call them weak by your own standards.",
      },
      {
        title: "궁시렁거리지 않기",
        ko: "경기 중 투덜대거나 상대의 실수를 두고 이러쿵저러쿵하지 않습니다.",
        en: "Don't grumble during play or comment on your opponent's mistakes.",
      },
      {
        title: "전화와 껌은 경기 뒤에",
        ko: "경기 중에는 전화를 받거나 껌을 씹지 않습니다.",
        en: "Don't take calls or chew gum during a game.",
      },
      {
        title: "경기에만 집중하기",
        ko: "경기 중 주변 사람과 이야기하거나 오가는 사람을 쳐다보며 치지 않습니다.",
        en: "Don't chat with bystanders or watch people passing by while you play.",
      },
    ],
  },
  {
    id: "result",
    title: "승패를 대하는 태도",
    titleEn: "Winning & Losing",
    items: [
      {
        title: "패배는 깨끗이 인정하기",
        ko: "지면 깨끗이 인정하고, 인상 쓰지 않습니다.",
        en: "Accept a loss gracefully — no sour faces.",
      },
      {
        title: "이겨도 약 올리지 않기",
        ko: "이겼다고 상대방을 약 올리지 않습니다.",
        en: "Don't taunt your opponent when you win.",
      },
      {
        title: "컨디션 핑계 대지 않기",
        ko: "\"오늘 컨디션이 안 좋아서 졌다\"는 말은 하지 않습니다.",
        en: "Don't blame a loss on not feeling well today.",
      },
      {
        title: "내리 5판 이기지 않기",
        ko: "한 상대에게 5판을 연속해서 이기지 않습니다.",
        en: "Don't win five straight games without giving your opponent a chance.",
      },
      {
        title: "중간에 그만두지 않기",
        ko: "재미없다고 한 판만 치고 그만두거나, 하수에게 질 듯하면 치다 말고 가지 않습니다.",
        en: "Don't quit after one game because it's dull, or walk away when you're about to lose to a lower-rated player.",
      },
    ],
  },
  {
    id: "together",
    title: "함께 성장하기",
    titleEn: "Growing Together",
    items: [
      {
        title: "핸디는 적당히 부탁하기",
        ko: "레이팅 차이가 날 때 하수는 상수에게 핸디를 과하지 않게 부탁합니다.",
        en: "When ratings differ, the lower-rated player should ask for a reasonable handicap.",
      },
      {
        title: "고수에게 오래 매달리지 않기",
        ko: "자기 실력만을 위해 고수하고만 치지 않고, 15분쯤 지나면 계속해도 되는지 물어봅니다.",
        en: "Don't play only with stronger players, and after about 15 minutes ask if they're happy to continue.",
      },
      {
        title: "배우는 사람에 맞춰 지도하기",
        ko: "하수를 지도할 때는 자기 스타일을 일방적으로 강요하지 않고, 무엇을 배우고 싶어 하는지 먼저 생각합니다.",
        en: "When coaching, think about what the learner wants rather than imposing your own style.",
      },
      {
        title: "복식 파트너 배려하기",
        ko: "파트너가 실수해도 얼굴을 찌푸리지 않고, 혼자만의 플레이를 하지 않습니다.",
        en: "In doubles, don't frown at your partner's mistakes or play as if you were alone.",
      },
      {
        title: "외부 대회에도 참가하기",
        ko: "탁구장 안에서만 치지 말고 외부 대회에 나가 실력을 키우고 동호회 친목을 다집니다.",
        en: "Join outside tournaments too — improve your game and build friendships across clubs.",
      },
    ],
  },
];
