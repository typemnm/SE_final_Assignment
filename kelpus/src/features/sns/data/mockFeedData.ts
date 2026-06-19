export interface RunningStats {
  distanceKm: number;
  duration: string;
  pace: string;
  calories: number;
  steps?: number;
}

export interface MockFeedPost {
  id: string;
  author: {
    username: string;
    displayName: string;
    profileImage: string;
  };
  image?: string;
  runningStats?: RunningStats;
  caption: string;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  audioTitle: string;
  postedAt: string;
}

export const MOCK_FEED: MockFeedPost[] = [
  {
    id: '1',
    author: {
      username: 'kelpus_runner_jisu',
      displayName: '지수',
      profileImage: 'https://i.pravatar.cc/100?img=32',
    },
    runningStats: {
      distanceKm: 7.3,
      duration: '41:22',
      pace: "5'40\"",
      calories: 512,
      steps: 10240,
    },
    caption: '오늘 새벽 5시에 일어나 한강 러닝 완료 🌅\n처음엔 힘들었지만 끝나고 나면 항상 뿌듯해요.\n#kelpus 앱으로 페이스 관리하니까 훨씬 수월해졌어요!',
    hashtags: ['#kelpus', '#kelpus러닝', '#새벽러닝', '#한강', '#7km'],
    likesCount: 12400,
    commentsCount: 287,
    audioTitle: 'APT. - ROSE',
    postedAt: '2024-06-18T05:30:00Z',
  },
  {
    id: '2',
    author: {
      username: 'healthy_minjun',
      displayName: '민준',
      profileImage: 'https://i.pravatar.cc/100?img=11',
    },
    runningStats: {
      distanceKm: 10.5,
      duration: '59:48',
      pace: "5'41\"",
      calories: 738,
      steps: 14700,
    },
    caption: '드디어 10km 완주 🏅\n3개월 전엔 3km도 힘들었는데 이제 10km 거뜬해요.\n#kelpus 로 꾸준히 기록하다 보니 어느새 이렇게 됐네요 😭\n다음 목표는 하프마라톤!',
    hashtags: ['#kelpus', '#10km완주', '#마라톤준비', '#기록갱신', '#kelpus러닝'],
    likesCount: 24600,
    commentsCount: 531,
    audioTitle: 'Supernova - aespa',
    postedAt: '2024-06-17T07:15:00Z',
  },
  {
    id: '3',
    author: {
      username: 'salad_yena',
      displayName: '예나',
      profileImage: 'https://i.pravatar.cc/100?img=44',
    },
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    caption: '오늘 점심 샐러드 🥗\n닭가슴살 + 퀴노아 + 아보카도 + 방울토마토 조합\n#kelpus 식단 분석: 단백질 34g · 탄수화물 29g · 지방 12g\n다이어트 중에도 이렇게 맛있게 먹을 수 있어요!',
    hashtags: ['#kelpus', '#kelpus식단', '#닭가슴살샐러드', '#클린이팅', '#다이어트식단'],
    likesCount: 18300,
    commentsCount: 412,
    audioTitle: 'Night Changes - One Direction',
    postedAt: '2024-06-16T12:20:00Z',
  },
  {
    id: '4',
    author: {
      username: 'morning_sehun',
      displayName: '세훈',
      profileImage: 'https://i.pravatar.cc/100?img=7',
    },
    runningStats: {
      distanceKm: 5.0,
      duration: '27:30',
      pace: "5'30\"",
      calories: 351,
      steps: 7000,
    },
    caption: '비 오는 날 야외 러닝 도전 🌧️\n우산 없이 그냥 뛰어버렸어요 ㅋㅋ\n젖어서 뛰니까 오히려 시원하고 기분 최고!\n#kelpus 덕에 페이스 유지 완벽하게 됐어요',
    hashtags: ['#kelpus', '#비오는날러닝', '#5km', '#kelpus러닝', '#도전'],
    likesCount: 9100,
    commentsCount: 198,
    audioTitle: 'Rain On Me - Lady Gaga, Ariana Grande',
    postedAt: '2024-06-15T08:00:00Z',
  },
  {
    id: '5',
    author: {
      username: 'mealprep_dahye',
      displayName: '다혜',
      profileImage: 'https://i.pravatar.cc/100?img=56',
    },
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=600',
    caption: '주말 밀프렙 완료 🍱\n일주일치 도시락 한꺼번에 만들었어요!\n#kelpus 앱에 영양소 미리 입력해두면 일주일 식단 계획이 너무 편해요.\n바쁜 직장인들 꼭 따라해보세요!',
    hashtags: ['#kelpus', '#밀프렙', '#일주일식단', '#kelpus식단', '#건강습관'],
    likesCount: 31200,
    commentsCount: 748,
    audioTitle: 'Dynamite - BTS',
    postedAt: '2024-06-14T15:00:00Z',
  },
  {
    id: '6',
    author: {
      username: 'park_runner_taeyang',
      displayName: '태양',
      profileImage: 'https://i.pravatar.cc/100?img=17',
    },
    image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=600',
    caption: '공원 러닝 코스 추천 🌳\n서울숲 5km 코스인데 나무 그늘도 있고 바닥도 좋아서 무릎 부담 적어요.\n#kelpus 로 코스 기록해두면 다음에도 그대로 따라 뛸 수 있어서 편해요 🗺️',
    hashtags: ['#kelpus', '#서울숲러닝', '#공원달리기', '#kelpus러닝', '#코스추천'],
    likesCount: 15800,
    commentsCount: 334,
    audioTitle: 'Strawberry Forever - TOMORROW X TOGETHER',
    postedAt: '2024-06-13T10:30:00Z',
  },
  {
    id: '7',
    author: {
      username: 'protein_soyeon',
      displayName: '소연',
      profileImage: 'https://i.pravatar.cc/100?img=63',
    },
    image: 'https://images.unsplash.com/photo-1583500557462-e1ca9268a36b?w=600',
    caption: '운동 후 단백질 쉐이크 타임 🥤\n바나나 + 무가당 두유 + 단백질 파우더 조합이요!\n#kelpus 가 칼로리 자동 계산해줘서 이제 직접 계산 안 해도 돼요.\n오늘도 운동 완료 💪',
    hashtags: ['#kelpus', '#단백질쉐이크', '#운동후식단', '#kelpus식단', '#근육키우기'],
    likesCount: 7600,
    commentsCount: 163,
    audioTitle: 'GODS - NewJeans',
    postedAt: '2024-06-12T18:45:00Z',
  },
  {
    id: '8',
    author: {
      username: 'kelpus_jihoon',
      displayName: '지훈',
      profileImage: 'https://i.pravatar.cc/100?img=25',
    },
    runningStats: {
      distanceKm: 8.7,
      duration: '48:03',
      pace: "5'31\"",
      calories: 611,
      steps: 12180,
    },
    caption: '퇴근 후 야간 러닝 🌙\n도심 야경 보면서 달리는 맛이 있어요.\n스트레스가 다 날아가는 느낌!\n#kelpus 에 오늘 기록 저장 완료 ✅',
    hashtags: ['#kelpus', '#야간러닝', '#kelpus러닝', '#퇴근후운동', '#도심런'],
    likesCount: 4300,
    commentsCount: 89,
    audioTitle: 'Hype Boy - NewJeans',
    postedAt: '2024-06-11T21:00:00Z',
  },
  {
    id: '9',
    author: {
      username: 'wellness_naeun',
      displayName: '나은',
      profileImage: 'https://i.pravatar.cc/100?img=38',
    },
    caption: '#kelpus 사용 두 달 후기 ✍️\n솔직히 처음엔 그냥 한 번 써보는 거였는데…\n이제 없으면 하루가 허전해요 😂\n식단, 운동, 수면까지 한 앱에서 관리되니까 너무 편해요.\n체중 -3.5kg 달성!!! 다들 꼭 써보세요 🙌',
    hashtags: ['#kelpus', '#kelpus후기', '#다이어트성공', '#앱추천', '#건강관리'],
    likesCount: 43200,
    commentsCount: 1024,
    audioTitle: 'Love Story - Taylor Swift',
    postedAt: '2024-06-10T20:00:00Z',
  },
  {
    id: '10',
    author: {
      username: 'ultra_runner_junho',
      displayName: '준호',
      profileImage: 'https://i.pravatar.cc/100?img=3',
    },
    runningStats: {
      distanceKm: 21.1,
      duration: '1:58:42',
      pace: "5'37\"",
      calories: 1480,
      steps: 29540,
    },
    caption: '하프마라톤 완주 🎉🏃\n21.1km를 두 시간 안에 끊었어요!!!\n#kelpus 로 6개월 동안 꾸준히 기록하고 훈련했더니 드디어 이 날이 왔네요.\n응원해주신 모든 분들 감사해요 🙏',
    hashtags: ['#kelpus', '#하프마라톤', '#21km', '#kelpus러닝', '#완주'],
    likesCount: 48700,
    commentsCount: 1382,
    audioTitle: 'Fighter - Christina Aguilera',
    postedAt: '2024-06-08T09:00:00Z',
  },
  {
    id: '11',
    author: {
      username: 'diet_chaerin',
      displayName: '채린',
      profileImage: 'https://i.pravatar.cc/100?img=49',
    },
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    caption: '오늘 저녁 고단백 식단 🥗\n그릭요거트 볼에 블루베리랑 아몬드 올려서 먹었어요.\n#kelpus 식단 기록 보니까 오늘 단백질 목표 달성!\n작은 성취감이 쌓이면 큰 변화가 되더라고요 😊',
    hashtags: ['#kelpus', '#kelpus식단', '#고단백식단', '#건강식', '#그릭요거트'],
    likesCount: 11900,
    commentsCount: 256,
    audioTitle: 'Cruel Summer - Taylor Swift',
    postedAt: '2024-06-05T19:30:00Z',
  },
  {
    id: '12',
    author: {
      username: 'fit_lifestyle_yujin',
      displayName: '유진',
      profileImage: 'https://i.pravatar.cc/100?img=61',
    },
    runningStats: {
      distanceKm: 6.0,
      duration: '33:00',
      pace: "5'30\"",
      calories: 421,
      steps: 8400,
    },
    caption: '오늘도 #kelpus 와 함께 6km 완주 💨\n페이스 5분대 유지하는 게 이제 자연스러워졌어요.\n꾸준함이 답인 것 같아요.\n내일도 달릴 사람 손! 🙋',
    hashtags: ['#kelpus', '#kelpus러닝', '#6km', '#페이스관리', '#꾸준함'],
    likesCount: 6200,
    commentsCount: 144,
    audioTitle: 'Pink Venom - BLACKPINK',
    postedAt: '2024-05-25T07:00:00Z',
  },
];

export const MOCK_COMMENTS = [
  {id: 'c1', username: 'kelpus_fan_mirae', avatar: 'https://i.pravatar.cc/60?img=31', text: '#kelpus 저도 쓰는데 진짜 앱 최고예요! 같이 뛰어요 🏃', likes: 87},
  {id: 'c2', username: 'runner_hyunwoo', avatar: 'https://i.pravatar.cc/60?img=14', text: '저도 #kelpus 로 기록하기 시작했어요! 페이스 관리가 확실히 달라지더라고요 💪', likes: 54},
  {id: 'c3', username: 'diet_jiyoung', avatar: 'https://i.pravatar.cc/60?img=43', text: '#kelpus 식단 기능 써봤는데 칼로리 계산이 너무 편해요 😍', likes: 39},
  {id: 'c4', username: 'morning_haejin', avatar: 'https://i.pravatar.cc/60?img=27', text: '오늘도 #kelpus 와 함께 아침 달리기 완료했어요! 자극받았습니다 ✨', likes: 71},
  {id: 'c5', username: 'fit_sungmin', avatar: 'https://i.pravatar.cc/60?img=8', text: '진짜 대단해요… 저도 #kelpus 시작해볼게요 🔥', likes: 118},
  {id: 'c6', username: 'health_yoonji', avatar: 'https://i.pravatar.cc/60?img=50', text: '#kelpus 쓴 지 3주 됐는데 벌써 2kg 빠졌어요!!! 감사해요', likes: 95},
  {id: 'c7', username: 'marathon_kyungho', avatar: 'https://i.pravatar.cc/60?img=16', text: '하프마라톤 도전 중인데 #kelpus 로 훈련 기록 관리하니까 너무 좋더라고요 🗺️', likes: 62},
  {id: 'c8', username: 'clean_eater_bomi', avatar: 'https://i.pravatar.cc/60?img=35', text: '#kelpus 식단 챌린지 같이 해요! 오늘도 파이팅 🥗', likes: 48},
];
