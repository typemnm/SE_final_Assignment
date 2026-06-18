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
      username: 'runner_sora',
      displayName: '소라',
      profileImage: 'https://i.pravatar.cc/100?img=20',
    },
    runningStats: {
      distanceKm: 5.2,
      duration: '28:34',
      pace: "5'29\"",
      calories: 387,
      steps: 7240,
    },
    caption:
      '오늘 아침 한강변 달리기 완료 🏃‍♀️\n새벽 공기가 너무 좋아서 계획보다 더 달렸어요.\nKELPUS 러닝 기록으로 남겨두기!',
    hashtags: ['#KELPUS러닝', '#한강러닝', '#아침운동', '#5km'],
    likesCount: 4200,
    commentsCount: 128,
    audioTitle: 'Running in the 90s - Max Coveri',
    postedAt: '2024-06-17T06:30:00Z',
  },
  {
    id: '2',
    author: {
      username: 'fit_jiyeon',
      displayName: '지연',
      profileImage: 'https://i.pravatar.cc/100?img=5',
    },
    image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=600',
    caption:
      '오늘 점심 도시락 🍱\n직접 싼 도시락인데 생각보다 잘 나왔다 ㅎㅎ\n샐러드 + 오므라이스 + 에다마메 조합으로 탄:단:지 완벽!',
    hashtags: ['#KELPUS식단', '#도시락', '#클린이팅', '#건강식'],
    likesCount: 8100,
    commentsCount: 342,
    audioTitle: 'Healthy Life - Original Mix',
    postedAt: '2024-06-16T12:00:00Z',
  },
  {
    id: '3',
    author: {
      username: 'wellness_minji',
      displayName: '민지',
      profileImage: 'https://i.pravatar.cc/100?img=47',
    },
    caption:
      '3개월 연속 운동 중 💪\n포기하고 싶은 순간도 있었지만, KELPUS 앱으로 기록하고 나서 눈에 보이는 변화가 생겼어요.\n체중 -4.8kg, 체지방 -3.2%, 근육량 +1.5kg 📊\n꾸준함이 답이라는 걸 이제야 실감합니다. 같이 해요!',
    hashtags: ['#KELPUS', '#3개월도전', '#다이어트성공', '#꾸준함'],
    likesCount: 15600,
    commentsCount: 892,
    audioTitle: 'Keep Going - Motivational',
    postedAt: '2024-06-15T20:00:00Z',
  },
  {
    id: '4',
    author: {
      username: 'trail_junki',
      displayName: '준기',
      profileImage: 'https://i.pravatar.cc/100?img=15',
    },
    runningStats: {
      distanceKm: 10.1,
      duration: '58:20',
      pace: "5'46\"",
      calories: 712,
      steps: 14100,
    },
    caption:
      '주말 장거리 10km 완주!! 🏅\n8km 지점에서 포기하고 싶었는데 참고 달렸더니 개인 최고 기록!\n가을엔 하프마라톤 나가볼 예정 🎯',
    hashtags: ['#KELPUS러닝', '#10km', '#장거리', '#하프마라톤준비'],
    likesCount: 6730,
    commentsCount: 215,
    audioTitle: 'Eye of the Tiger - Survivor',
    postedAt: '2024-06-15T08:20:00Z',
  },
  {
    id: '5',
    author: {
      username: 'kelpus_official',
      displayName: 'KELPUS',
      profileImage: 'https://i.pravatar.cc/100?img=9',
    },
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600',
    caption:
      '오늘의 KELPUS 추천 아침식사 🍓\n딸기 그래놀라 요거트 파르페!\n그릭요거트 200g + 그래놀라 40g + 딸기 100g\n단백질 18g · 탄수화물 42g — 완벽한 하루 시작 🌿',
    hashtags: ['#KELPUS', '#추천식단', '#파르페', '#건강아침'],
    likesCount: 12500,
    commentsCount: 456,
    audioTitle: 'KELPUS Official BGM',
    postedAt: '2024-06-14T09:00:00Z',
  },
  {
    id: '6',
    author: {
      username: 'morning_yuna',
      displayName: '유나',
      profileImage: 'https://i.pravatar.cc/100?img=12',
    },
    runningStats: {
      distanceKm: 6.3,
      duration: '35:12',
      pace: "5'35\"",
      calories: 441,
      steps: 8820,
    },
    caption:
      '퇴근 후 야간 러닝 🌙\n스트레스 해소에는 역시 달리기가 최고예요.\n어두운데도 한강 조명이 너무 예뻐서 절로 기분이 좋아졌어요 ✨',
    hashtags: ['#야간러닝', '#KELPUS러닝', '#퇴근후운동', '#한강야경'],
    likesCount: 3900,
    commentsCount: 167,
    audioTitle: 'Night Run - Lo-Fi Beats',
    postedAt: '2024-06-13T21:30:00Z',
  },
  {
    id: '7',
    author: {
      username: 'wellness_minho',
      displayName: '민호',
      profileImage: 'https://i.pravatar.cc/100?img=52',
    },
    caption:
      'KELPUS 사용 한 달 후기 📱\n솔직히 처음엔 앱이 또 하나의 귀찮음이겠지 싶었는데…\n막상 쓰다 보니 매일 식단 기록이 습관이 됐어요.\n칼로리 자동 계산이 너무 편하고, 러닝 기록이랑 연동되는 게 신기해요.\n이번 달 식비도 줄었고 체중도 -2.1kg 👍\n다들 써보세요 진짜로!',
    hashtags: ['#KELPUS후기', '#식단관리', '#다이어트앱', '#추천'],
    likesCount: 9200,
    commentsCount: 384,
    audioTitle: 'Chill Study Beats Vol.3',
    postedAt: '2024-06-12T19:00:00Z',
  },
  {
    id: '8',
    author: {
      username: 'health_sora',
      displayName: '소라',
      profileImage: 'https://i.pravatar.cc/100?img=20',
    },
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600',
    caption:
      '케토 다이어트 중 최애 샐러드 🥗\n케일 + 아보카도 + 베이컨 + 반숙 달걀\nKELPUS 분석: 탄수화물 8g · 단백질 24g · 지방 38g\n저탄고지 완벽 구성 💯',
    hashtags: ['#KELPUS식단', '#케토다이어트', '#케일샐러드', '#저탄고지'],
    likesCount: 7200,
    commentsCount: 198,
    audioTitle: 'Good Life - G-Eazy',
    postedAt: '2024-06-11T12:30:00Z',
  },
];

export const MOCK_COMMENTS = [
  {id: 'c1', username: 'runner_kim', avatar: 'https://i.pravatar.cc/60?img=21', text: '대박이에요! 저도 KELPUS 써볼게요 🏃', likes: 45},
  {id: 'c2', username: 'fit_park', avatar: 'https://i.pravatar.cc/60?img=22', text: '아침 러닝 최고죠! 저도 매일 뛰는 중이에요 💪', likes: 32},
  {id: 'c3', username: 'healthkr', avatar: 'https://i.pravatar.cc/60?img=23', text: '#KELPUS러닝 함께해요! 오늘도 완주하셨나요?', likes: 18},
  {id: 'c4', username: 'diet_choi', avatar: 'https://i.pravatar.cc/60?img=24', text: '식단 너무 완벽해요. 저도 저렇게 해보고 싶다 😍', likes: 27},
  {id: 'c5', username: 'morning_lee', avatar: 'https://i.pravatar.cc/60?img=25', text: '3개월 꾸준히 하시다니 정말 대단해요 ✨', likes: 61},
  {id: 'c6', username: 'kelpus_fan', avatar: 'https://i.pravatar.cc/60?img=26', text: 'KELPUS 앱이랑 같이 쓰면 더 좋더라구요!', likes: 14},
];
