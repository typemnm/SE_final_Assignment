# Kelpus 시퀀스 플로우 및 비즈니스 로직 문서

## 목차
1. [개요](#개요)
2. [섹션 0 - 백그라운드 SNS 크롤링](#섹션-0---백그라운드-sns-크롤링)
3. [섹션 1 - 로그인 및 브이로그 피드 연동](#섹션-1---로그인-및-브이로그-피드-연동)
4. [섹션 2 - 식단 동기화 및 AI 맞춤 분석](#섹션-2---식단-동기화-및-ai-맞춤-분석)
5. [섹션 3 - 러닝 기록 동기화 및 리더보드](#섹션-3---러닝-기록-동기화-및-리더보드)
6. [에러 핸들링 시나리오](#에러-핸들링-시나리오)

## 개요

Kelpus 애플리케이션의 4가지 핵심 시퀀스 플로우를 상세히 설명합니다. 각 플로우는 사용자 입장에서의 상호작용과 백엔드 처리 과정을 포함합니다.

### 참여자 (Actors)
- **User**: 애플리케이션 사용자
- **Kelpus App**: React Native 모바일 앱 (클라이언트)
- **Backend API**: FastAPI 서버
- **Database**: PostgreSQL
- **OS Health API**: Samsung Health / Apple HealthKit
- **SNS API**: Instagram API
- **AI Engine**: 식단 분석 엔진
- **Map API**: 지도 렌더링 서비스

---

## 섹션 0 - 백그라운드 SNS 크롤링

### 목적
배경에서 주기적으로 #kelpus 해시태그 게시물을 수집하고 캐싱하여 피드 로딩 속도 최적화

### 실행 주기
- **간격**: 1시간마다 (자동화된 스케줄 작업)
- **시작**: 서버 부트 후 첫 실행, 이후 1시간 단위로 반복

### 시퀀스 다이어그램

```
┌─────────────┐      ┌─────────────┐      ┌──────────┐      ┌───────┐
│ Backend API │      │  SNS API    │      │Database │      │ Cache │
└─────────────┘      └─────────────┘      └──────────┘      └───────┘
      │                      │                  │                 │
      │ [매 1시간마다]       │                  │                 │
      │─────────────────→    │                  │                 │
      │ fetch_hashtag_posts  │                  │                 │
      │ (tag: '#kelpus')    │                  │                 │
      │                      │                  │                 │
      │                      │ [Instagram API  │                 │
      │                      │  호출]          │                 │
      │                      │                  │                 │
      │                      │←─ 게시물 목록  │                 │
      │←─────────────────────│  (50개)        │                 │
      │ posts = [            │                  │                 │
      │   {post_id: '123', │                  │                 │
      │    thumbnail_url,   │                  │                 │
      │    likes_count,     │                  │                 │
      │    hashtags: [...]  │                  │                 │
      │   },                │                  │                 │
      │   ...               │                  │                 │
      │ ]                   │                  │                 │
      │                      │                  │                 │
      │──────────────────────────────────────→ │                 │
      │    미디어 저장         │                  │                 │
      │    INSERT INTO       │                  │                 │
      │    blog_feed         │                  │                 │
      │    VALUES(...)       │                  │                 │
      │                      │                  │                 │
      │←─────────────────────────────────────── │                 │
      │           저장 완료                      │                 │
      │                      │                  │                 │
      │──────────────────────────────────────────────────────→ │
      │    캐시 업데이트                          │                 │
      │    CACHE: feed_list = {...}           │                 │
      │                      │                  │                 │
      │←─────────────────────────────────────────────────────── │
      │              캐시 저장 완료                │                 │
```

### 상세 로직

#### 1단계: 해시태그 게시물 수집
```python
async def crawl_hashtag_posts():
    """매 1시간마다 실행되는 배경 작업"""
    
    # Instagram API에서 #kelpus 게시물 조회 (최신 50개)
    posts = await instagram_api.search_hashtag_posts(
        hashtag='kelpus',
        limit=50,
        sort='latest'
    )
    
    return posts
    # 반환 형식:
    # [{
    #   'post_id': 'insta_12345',
    #   'author_account': 'user_account',
    #   'original_url': 'https://instagram.com/p/...',
    #   'thumbnail_url': 'https://...',
    #   'likes_count': 234,
    #   'hashtags': ['kelpus', '건강', '러닝'],
    #   'crawled_at': datetime.now()
    # }, ...]
```

#### 2단계: 중복 검사 및 저장
```python
async def save_crawled_posts(posts: List[dict]):
    """새로운 게시물만 DB에 저장"""
    
    for post in posts:
        # 기존 게시물인지 확인
        existing = await db.blog_feed.find_one(
            {'post_id': post['post_id']}
        )
        
        if not existing:
            # 새 게시물 저장
            await db.blog_feed.insert_one({
                'feed_id': uuid.uuid4(),
                'post_id': post['post_id'],
                'original_url': post['original_url'],
                'author_account': post['author_account'],
                'hashtags': post['hashtags'],
                'likes_count': post['likes_count'],
                'thumbnail_url': post['thumbnail_url'],
                'cached_content': post,
                'created_at': datetime.now(),
                'updated_at': datetime.now()
            })
        else:
            # 기존 게시물 업데이트 (좋아요 수 등)
            await db.blog_feed.update_one(
                {'post_id': post['post_id']},
                {'$set': {
                    'likes_count': post['likes_count'],
                    'updated_at': datetime.now()
                }}
            )
```

#### 3단계: 캐시 갱신
```python
async def update_feed_cache():
    """Redis 캐시 업데이트"""
    
    # 최신 게시물 100개 조회
    recent_feeds = await db.blog_feed.find().sort(
        'created_at', -1
    ).limit(100)
    
    # 캐시 저장 (TTL: 1시간)
    await redis.setex(
        'feed_list_recent',
        3600,  # 1시간
        json.dumps([feed async for feed in recent_feeds])
    )
```

### 에러 처리
```python
try:
    posts = await instagram_api.search_hashtag_posts(...)
    await save_crawled_posts(posts)
    await update_feed_cache()
except InstagramAPIError as e:
    logger.error(f"Instagram API 오류: {e}")
    # 다음 스케줄까지 대기, 현재 캐시 유지
except DatabaseError as e:
    logger.error(f"DB 저장 오류: {e}")
    # Alert 발송, 운영팀 알림
```

---

## 섹션 1 - 로그인 및 브이로그 피드 연동

### 목적
사용자 인증 후 커뮤니티 피드를 로드하여 표시

### 소요 시간
- 예상 시간: 2-3초 (네트워크 지연 포함)

### 시퀀스 다이어그램

```
┌────────┐    ┌──────────────┐    ┌────────┐    ┌──────────┐
│ User   │    │ Kelpus App   │    │Backend │    │Database  │
└────────┘    └──────────────┘    └────────┘    └──────────┘
   │                │                  │            │
   │ 로그인          │                  │            │
   │ [이메일/비번]  │                  │            │
   ├──────────────→ │                  │            │
   │                │                  │            │
   │                │ POST /api/v1/auth/login     │
   │                ├─────────────────→│            │
   │                │                  │            │
   │                │                  │ [bcrypt   │
   │                │                  │  검증]    │
   │                │                  │            │
   │                │                  │ SELECT * FROM users
   │                │                  │ WHERE email = ?
   │                │                  ├───────────→│
   │                │                  │            │
   │                │                  │←───────────┤
   │                │                  │ 사용자 정보 │
   │                │                  │            │
   │                │ ← 200 OK         │            │
   │                │ {                │            │
   │                │   access_token,  │            │
   │                │   refresh_token  │            │
   │                │ }                │            │
   │                │←─────────────────┤            │
   │                │                  │            │
   │ [로그인 성공]  │                  │            │
   │←───────────────┤                  │            │
   │                │                  │            │
   │                │ 피드 조회         │            │
   │                ├──────────────────┤─────────→│
   │                │ GET /api/v1/feed │ (캐시에서 │
   │                │ with JWT token   │  조회)   │
   │                │                  │            │
   │                │                  │ SELECT * FROM blog_feed
   │                │                  │ ORDER BY created_at DESC
   │                │                  │ LIMIT 20
   │                │                  ├───────────→│
   │                │                  │            │
   │                │                  │←───────────┤
   │                │                  │ 피드 리스트 │
   │                │← 200 OK          │            │
   │                │ {                │            │
   │                │   feeds: [...]   │            │
   │                │ }                │            │
   │                │←─────────────────┤            │
   │                │                  │            │
   │ [피드 표시]    │                  │            │
   │←───────────────┤                  │            │
   │                │                  │            │
```

### 상세 로직

#### 인증 처리
```python
# backend/api/v1/auth.py
@router.post("/login")
async def login(credentials: LoginSchema):
    """사용자 로그인"""
    
    # 이메일로 사용자 조회
    user = await user_repo.find_by_email(credentials.email)
    
    if not user:
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )
    
    # 비밀번호 검증 (bcrypt)
    if not bcrypt.verify(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="이메일 또는 비밀번호가 올바르지 않습니다."
        )
    
    # JWT 토큰 생성
    access_token = create_access_token(user.user_id)
    refresh_token = create_refresh_token(user.user_id)
    
    return {
        "user_id": user.user_id,
        "email": user.email,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": 3600
    }
```

#### 피드 조회
```python
# backend/api/v1/feed.py
@router.get("/")
async def get_feed(
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """메인 피드 조회"""
    
    # 캐시에서 먼저 조회
    cached_feeds = await redis.get('feed_list_recent')
    
    if cached_feeds:
        feeds = json.loads(cached_feeds)
    else:
        # 캐시 미스 시 DB에서 조회
        feeds = await blog_feed_repo.find_recent(
            limit=100,
            offset=0
        )
        
        # 캐시 저장
        await redis.setex(
            'feed_list_recent',
            3600,
            json.dumps(feeds)
        )
    
    # 페이징 처리
    paginated_feeds = feeds[offset:offset+limit]
    
    return {
        "feeds": paginated_feeds,
        "pagination": {
            "total": len(feeds),
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < len(feeds)
        }
    }
```

#### 프론트엔드 처리
```typescript
// frontend/services/authService.ts
async function login(email: string, password: string) {
  const response = await api.post('/auth/login', {
    email,
    password
  });
  
  // 토큰 저장 (AsyncStorage)
  await AsyncStorage.setItem('access_token', response.data.access_token);
  await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
  
  // Redux 상태 업데이트
  dispatch(setUser(response.data));
  dispatch(setAuthToken(response.data.access_token));
}

// frontend/services/feedService.ts
async function getFeed(limit: number = 20, offset: number = 0) {
  const token = await AsyncStorage.getItem('access_token');
  
  const response = await api.get('/feed', {
    params: { limit, offset },
    headers: { Authorization: `Bearer ${token}` }
  });
  
  // Redux 상태 업데이트
  dispatch(setFeeds(response.data.feeds));
  
  return response.data;
}
```

---

## 섹션 2 - 식단 동기화 및 AI 맞춤 분석

### 목적
사용자의 OS Health 데이터를 동기화하고, 구독 플랜 제한을 확인한 후 AI 분석 수행

### 소요 시간
- 데이터 동기화: 1-2초
- AI 분석: 3-5초 (구독 제한 확인 포함)

### 시퀀스 다이어그램

```
┌────────┐    ┌──────────────┐    ┌────────┐    ┌──────────┐    ┌────────┐    ┌─────────┐    ┌──────────┐
│ User   │    │ Kelpus App   │    │Backend │    │Database  │    │OS Health   │ │AI Engine│    │NotifyDomain
└────────┘    └──────────────┘    └────────┘    └──────────┘    └────────┘    └─────────┘    └──────────┘
   │                │                  │            │                 │            │                 │
   │ 식단 동기화     │                  │            │                 │            │                 │
   │                │                  │            │                 │            │                 │
   ├──────────────→ │                  │            │                 │            │                 │
   │ [OS Health     │                  │            │                 │            │                 │
   │  데이터 조회]  │                  │            │                 │            │                 │
   │                │ POST /diet/sync  │            │                 │            │                 │
   │                ├─────────────────→│            │                 │            │                 │
   │                │                  │ [JWT 검증]│                 │            │                 │
   │                │                  │            │                 │            │                 │
   │                │                  │──────────────────────────→│            │                 │
   │                │                  │ getHealthData(user_id)   │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │←──────────────────────────│            │                 │
   │                │                  │ 건강 데이터 (칼로리, 영양)│            │                 │
   │                │                  │                             │            │                 │
   │                │                  │ 데이터 저장               │            │                 │
   │                │                  ├───────────────────────→│            │                 │
   │                │                  │ INSERT INTO diet_record│            │                 │
   │                │                  │ VALUES(...)            │            │                 │
   │                │                  │                             │            │                 │
   │                │ ← 200 OK (동기화 │←───────────────────────│            │                 │
   │                │   완료)          │                             │            │                 │
   │                │←─────────────────┤                             │            │                 │
   │                │                  │                             │            │                 │
   │ [AI 분석 요청] │                  │                             │            │                 │
   ├──────────────→ │                  │                             │            │                 │
   │ [이미지 URL   │                  │                             │            │                 │
   │  포함]        │ POST /diet/analyze
   │                ├─────────────────→│                             │            │                 │
   │                │                  │ [구독 제한 확인]           │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │ SELECT subscription_plan│            │                 │
   │                │                  ├───────────────────────→│            │                 │
   │                │                  │                             │            │                 │
   │                │                  │←───────────────────────│            │                 │
   │                │                  │ plan = {                  │            │                 │
   │                │                  │   type: 'FREE',           │            │                 │
   │                │                  │   daily_limit: 3,         │            │                 │
   │                │                  │   remaining: 1            │            │                 │
   │                │                  │ }                         │            │                 │
   │                │                  │                             │            │                 │
   │                │          [alt: remaining > 0]                 │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │────────────────────────────────────→│   AI 분석          │
   │                │                  │ analyzeImage(image_url)    │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │                             │            │←───────────────│
   │                │                  │                             │            │ calories,     │
   │                │                  │                             │            │ nutrition     │
   │                │                  │                             │            │                 │
   │                │                  │←────────────────────────────────────│                     │
   │                │                  │ 분석 결과                   │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │ 결과 저장                   │            │                 │
   │                │                  ├───────────────────────→│            │                 │
   │                │                  │ INSERT INTO diet_analysis │            │                 │
   │                │                  │ UPDATE subscription_plan   │            │                 │
   │                │                  │   SET daily_limit = 0    │            │                 │
   │                │                  │                             │            │                 │
   │                │                  │←───────────────────────│            │                 │
   │                │ ← 200 OK         │                             │            │                 │
   │                │ {                │                             │            │                 │
   │                │   analysis_id,   │                             │            │                 │
   │                │   calories,      │                             │            │                 │
   │                │   ai_comment     │                             │            │                 │
   │                │ }                │                             │            │                 │
   │                │←─────────────────┤                             │            │                 │
   │                │                  │                             │            │                 │
   │ [분석 결과     │                  │                             │            │                 │
   │  표시]         │                  │                             │            │                 │
   │←───────────────┤                  │                             │            │                 │
   │                │                  │                             │            │                 │
   │          [alt: remaining = 0]     │                             │            │                 │
   │                │                  │                             │            │                 │
   │                │ ← 402 Forbidden  │                             │            │                 │
   │                │ {                │                             │            │                 │
   │                │   code: "SUBSCRIPTION_LIMIT",                 │            │                 │
   │                │   upgrade_url    │                             │            │                 │
   │                │ }                │                             │            │                 │
   │                │←─────────────────┤                             │            │                 │
   │                │                  │                             │            │ 알림 발송        │
   │                │                  │────────────────────────────────────────────────────→│
   │                │                  │                             │            │ "구독 업그레이드 │
   │                │                  │                             │            │  권장"          │
   │ [업그레이드    │                  │                             │            │                 │
   │  권장 안내]    │                  │                             │            │                 │
   │←───────────────┤                  │                             │            │                 │
```

### 상세 로직

#### 구독 게이팅 로직
```python
# backend/domain/subscription/service.py
class SubscriptionGateService:
    async def check_and_use_limit(self, user_id: str) -> bool:
        """
        사용자의 AI 분석 제한 확인 및 사용
        
        Returns:
            True: 분석 가능
            False: 제한 도달
        """
        # 구독 플랜 조회
        plan = await subscription_repo.get_plan(user_id)
        
        # 프리미엄은 무제한
        if plan.type == PlanType.PREMIUM:
            return True
        
        # 무료 플랜: 잔여 횟수 확인
        if plan.daily_ai_limit <= 0:
            # 이벤트 발행: 분석 제한 도달
            await event_bus.publish(
                AILimitExceededEvent(
                    user_id=user_id,
                    plan_type=plan.type,
                    timestamp=datetime.now()
                )
            )
            return False
        
        return True
    
    async def increment_usage(self, user_id: str):
        """사용량 증가"""
        plan = await subscription_repo.get_plan(user_id)
        plan.daily_ai_limit -= 1
        plan.total_usage += 1
        
        await subscription_repo.save(plan)
        
        # 이벤트 발행
        await event_bus.publish(
            AIAnalysisUsedEvent(
                user_id=user_id,
                remaining=plan.daily_ai_limit,
                timestamp=datetime.now()
            )
        )
```

#### AI 분석 요청
```python
# backend/api/v1/diet.py
@router.post("/analyze")
async def analyze_diet(
    request: DietAnalyzeRequest,
    current_user: User = Depends(get_current_user)
):
    """식단 AI 분석"""
    
    # 1. 구독 제한 확인
    can_analyze = await subscription_gate_service.check_and_use_limit(
        current_user.user_id
    )
    
    if not can_analyze:
        raise HTTPException(
            status_code=402,
            detail="일일 AI 분석 횟수를 초과했습니다."
        )
    
    # 2. AI 분석 실행
    analysis_result = await ai_adapter.analyze_diet_image(
        image_url=request.diet_image_url
    )
    # 반환:
    # {
    #   'total_calories': 650,
    #   'protein': 25,
    #   'carbohydrate': 80,
    #   'fat': 18,
    #   'ai_comment': '...',
    #   'nutrition_ratios': {
    #     'protein_ratio': 15.4,
    #     'carb_ratio': 49.2,
    #     'fat_ratio': 24.9
    #   }
    # }
    
    # 3. 분석 결과 저장
    diet_analysis = await diet_repo.create_analysis(
        record_id=request.record_id,
        user_id=current_user.user_id,
        analysis_data=analysis_result
    )
    
    # 4. 사용량 증가
    await subscription_gate_service.increment_usage(current_user.user_id)
    
    # 5. 이벤트 발행
    await event_bus.publish(
        DietAnalysisCompletedEvent(
            analysis_id=diet_analysis.analysis_id,
            user_id=current_user.user_id,
            calories=analysis_result['total_calories']
        )
    )
    
    return {
        "analysis_id": diet_analysis.analysis_id,
        "total_calories": analysis_result['total_calories'],
        "protein_ratio": analysis_result['nutrition_ratios']['protein_ratio'],
        "carb_ratio": analysis_result['nutrition_ratios']['carb_ratio'],
        "fat_ratio": analysis_result['nutrition_ratios']['fat_ratio'],
        "ai_comment": analysis_result['ai_comment']
    }
```

#### 알림 발송 (구독 제한 초과 시)
```python
# backend/domain/notification/service.py
async def on_ai_limit_exceeded(event: AILimitExceededEvent):
    """구독 제한 도달 시 알림"""
    
    user = await user_repo.get(event.user_id)
    
    notification = {
        "title": "AI 분석 횟수 초과",
        "message": "일일 AI 분석 횟수를 초과했습니다. 내일 다시 시도하거나 프리미엄으로 업그레이드하세요.",
        "type": "subscription_limit",
        "action_url": "/subscription/upgrade",
        "timestamp": event.timestamp
    }
    
    # Push 알림 발송
    await push_notification_service.send(
        user_id=user.user_id,
        notification=notification
    )
    
    # 이메일 발송 (선택사항)
    await email_service.send(
        to=user.email,
        subject="AI 분석 횟수 초과",
        template="daily_limit_exceeded",
        context={"user_name": user.email}
    )
```

---

## 섹션 3 - 러닝 기록 동기화 및 리더보드

### 목적
사용자의 러닝 데이터를 동기화하고, 리더보드 순위를 계산한 후 지도에 경로 표시

### 소요 시간
- 데이터 동기화: 1-2초
- 순위 계산: 2-3초
- 지도 렌더링: 2-3초 (총 5-8초)

### 시퀀스 다이어그램

```
┌────────┐    ┌──────────────┐    ┌────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│ User   │    │ Kelpus App   │    │Backend │    │Database  │    │OS Health   │ │Map API
└────────┘    └──────────────┘    └────────┘    └──────────┘    └─────────┘    └──────────┘
   │                │                  │            │                 │            │
   │ 러닝 동기화     │                  │            │                 │            │
   ├──────────────→ │                  │            │                 │            │
   │                │ POST /running/sync│            │                 │            │
   │                ├─────────────────→│            │                 │            │
   │                │                  │─────────────────────────────→│            │
   │                │                  │ getRunningData(user_id)      │            │
   │                │                  │                                │            │
   │                │                  │←─────────────────────────────│            │
   │                │                  │ 러닝 기록                     │            │
   │                │                  │ (거리, 경로, 시간, 페이스)   │            │
   │                │                  │                                │            │
   │                │                  │ 데이터 저장                    │            │
   │                │                  ├──────────────────────────→│            │
   │                │                  │ INSERT INTO running_record│            │
   │                │                  │ VALUES(...)                │            │
   │                │                  │                                │            │
   │                │ ← 200 OK         │←──────────────────────────│            │
   │                │ (동기화 완료)    │                                │            │
   │                │←─────────────────┤                                │            │
   │                │                  │                                │            │
   │ [러닝 데이터   │                  │                                │            │
   │  저장됨]       │                  │                                │            │
   │                │                  │                                │            │
   │ 순위 및 지도   │                  │                                │            │
   │ 요청           │                  │                                │            │
   ├──────────────→ │                  │                                │            │
   │                │ POST /running/record
   │                ├─────────────────→│                                │            │
   │                │                  │ [순위 계산]                  │            │
   │                │                  │                                │            │
   │                │                  │ SELECT sum(distance)       │            │
   │                │                  │ FROM running_record        │            │
   │                │                  │ WHERE user_id = ?          │            │
   │                │                  ├──────────────────────────→│            │
   │                │                  │                                │            │
   │                │                  │←──────────────────────────│            │
   │                │                  │ total_distance = 145.8    │            │
   │                │                  │                                │            │
   │                │                  │ rank 계산                     │            │
   │                │                  │ SELECT count(*) + 1       │            │
   │                │                  │ FROM leaderboard          │            │
   │                │                  │ WHERE total_distance > 145.8
   │                │                  ├──────────────────────────→│            │
   │                │                  │                                │            │
   │                │                  │←──────────────────────────│            │
   │                │                  │ rank = 234                │            │
   │                │                  │                                │            │
   │                │                  │ UPDATE leaderboard        │            │
   │                │                  │ SET overall_rank = 234,   │            │
   │                │                  │     percentile = 78.5     │            │
   │                │                  ├──────────────────────────→│            │
   │                │                  │                                │            │
   │                │ ← 200 OK         │←──────────────────────────│            │
   │                │ {                │                                │            │
   │                │   record_id,     │                                │            │
   │                │   leaderboard... │                                │            │
   │                │ }                │                                │            │
   │                │←─────────────────┤                                │            │
   │                │                  │                                │            │
   │ [순위 표시]    │                  │                                │            │
   │                │                  │                                │            │
   │ 지도 요청      │                  │                                │            │
   ├──────────────→ │                  │                                │            │
   │                │ GET /running/map/{record_id}                      │            │
   │                ├─────────────────→│                                │            │
   │                │                  │ GPS 좌표 조회                │            │
   │                │                  ├──────────────────────────→│            │
   │                │                  │                                │            │
   │                │                  │←──────────────────────────│            │
   │                │                  │ coordinates = [...]      │            │
   │                │                  │                                │            │
   │                │                  │──────────────────────────────────────→│
   │                │                  │ renderRoute(coordinates)  │            │
   │                │                  │                                │            │
   │                │                  │←───────────────────────────────────── │
   │                │                  │ map_image_url             │            │
   │                │ ← 200 OK         │                                │            │
   │                │ {                │                                │            │
   │                │   map_image_url, │                                │            │
   │                │   route_stats    │                                │            │
   │                │ }                │                                │            │
   │                │←─────────────────┤                                │            │
   │                │                  │                                │            │
   │ [경로 지도     │                  │                                │            │
   │  표시]         │                  │                                │            │
   │←───────────────┤                  │                                │            │
```

### 상세 로직

#### 순위 계산
```python
# backend/domain/running/service.py
class LeaderboardService:
    async def calculate_rank(self, user_id: str) -> LeaderboardData:
        """사용자의 순위 계산"""
        
        # 1. 사용자의 누적 거리 계산
        total_distance = await running_repo.get_total_distance(user_id)
        
        # 2. 전체 순위 계산
        rank = await db.execute("""
            SELECT COUNT(*) + 1 as rank
            FROM leaderboard
            WHERE total_distance > ?
        """, [total_distance])
        
        overall_rank = rank[0]['rank']
        
        # 3. 백분율 계산
        total_users = await db.execute("""
            SELECT COUNT(*) as count FROM leaderboard
        """)
        
        percentile = (1 - overall_rank / total_users[0]['count']) * 100
        
        # 4. 뱃지 획득 확인
        badges = await self._award_badges(total_distance, overall_rank)
        
        # 5. 리더보드 업데이트
        leaderboard = await leaderboard_repo.update(
            user_id=user_id,
            total_distance=total_distance,
            overall_rank=overall_rank,
            percentile=percentile,
            badges=badges
        )
        
        return leaderboard
    
    async def _award_badges(self, distance: float, rank: int) -> List[str]:
        """뱃지 획득"""
        badges = []
        
        if distance >= 5:
            badges.append("첫 5km")
        if distance >= 50:
            badges.append("50km 챌린지")
        if distance >= 100:
            badges.append("100km 어웨이")
        if rank <= 100:
            badges.append("상위 100")
        if rank <= 10:
            badges.append("상위 10")
        
        return badges
```

#### 지도 경로 렌더링
```python
# backend/adapters/map_adapter.py
class MapAdapter:
    async def render_route(self, coordinates: List[Tuple[float, float]]) -> str:
        """
        GPS 경로를 지도 이미지로 변환
        
        Args:
            coordinates: [(위도, 경도), ...] 좌표 리스트
        
        Returns:
            map_image_url: 지도 이미지 URL
        """
        
        # MapAPI에 요청
        response = await self._call_map_api(
            endpoint='/render_route',
            coordinates=coordinates,
            size='600x400',
            zoom=12
        )
        
        # 응답
        # {
        #   'image_url': 'https://maps.kelpus.com/route_001.png',
        #   'route_stats': {
        #     'distance': 5.2,
        #     'elevation_gain': 45,
        #     'elevation_loss': 42
        #   }
        # }
        
        return response['image_url']
```

#### 리더보드 조회
```python
# backend/api/v1/running.py
@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 50,
    offset: int = 0,
    period: str = 'all',  # 'weekly' | 'monthly' | 'all'
    current_user: User = Depends(get_current_user)
):
    """리더보드 조회"""
    
    # 기간별 필터링
    if period == 'weekly':
        start_date = datetime.now() - timedelta(days=7)
    elif period == 'monthly':
        start_date = datetime.now() - timedelta(days=30)
    else:
        start_date = None
    
    # 리더보드 조회
    leaderboard = await leaderboard_repo.find_top(
        limit=limit,
        offset=offset,
        start_date=start_date,
        order_by='total_distance'
    )
    
    # 사용자 순위 조회
    user_rank = await leaderboard_repo.get_rank(current_user.user_id)
    
    return {
        "leaderboard": leaderboard,
        "user_rank": user_rank,
        "pagination": {
            "total": await leaderboard_repo.count(),
            "limit": limit,
            "offset": offset,
            "has_next": offset + limit < await leaderboard_repo.count()
        }
    }
```

---

## 에러 핸들링 시나리오

### 시나리오 1: 네트워크 오류

```
사용자 요청
    ↓
API 호출 시도
    ↓
[네트워크 오류 발생]
    ├─ 타임아웃 (> 30초)
    └─ 연결 실패
    ↓
[재시도 로직]
    ├─ 지수 백오프: 1s, 2s, 4s (최대 3회)
    └─ 3회 모두 실패
    ↓
[에러 응답]
```

```python
async def api_call_with_retry(url, method='GET', max_retries=3):
    """재시도 로직을 포함한 API 호출"""
    
    for attempt in range(max_retries):
        try:
            response = await httpx.AsyncClient().request(
                method,
                url,
                timeout=30
            )
            return response
        
        except (httpx.TimeoutError, httpx.ConnectError) as e:
            if attempt < max_retries - 1:
                # 지수 백오프
                wait_time = 2 ** attempt
                await asyncio.sleep(wait_time)
                continue
            
            # 모든 재시도 실패
            raise NetworkError(f"API 호출 실패: {e}")
```

### 시나리오 2: 외부 API 오류

```
사용자 AI 분석 요청
    ↓
AI 분석 엔진에 요청
    ↓
[AI 엔진 응답]
    ├─ 200 OK: 정상 분석
    ├─ 503 Service Unavailable: 서비스 장애
    └─ 400 Bad Request: 이미지 오류
    ↓
[503 Service Unavailable]
    ├─ 재시도 가능 메시지 반환
    └─ 사용자에게 "잠시 후 다시 시도해주세요" 안내
    ↓
[400 Bad Request]
    └─ 사용자에게 "이미지를 다시 확인해주세요" 안내
```

```python
@router.post("/diet/analyze")
async def analyze_diet(request: DietAnalyzeRequest):
    """AI 분석 (외부 API 오류 처리)"""
    
    try:
        result = await ai_adapter.analyze_diet_image(
            request.diet_image_url
        )
    
    except AIServiceUnavailable:
        raise HTTPException(
            status_code=503,
            detail="AI 분석 서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요."
        )
    
    except InvalidImageError:
        raise HTTPException(
            status_code=400,
            detail="유효하지 않은 이미지입니다. 다른 사진을 확인해주세요."
        )
```

### 시나리오 3: 데이터베이스 오류

```
DB 쿼리 실행
    ↓
[연결 오류]
    ├─ 연결 풀 고갈
    └─ DB 서버 다운
    ↓
[에러 처리]
    ├─ 자동 재연결 시도
    ├─ 실패 시 에러 로깅
    └─ 사용자에게 "서비스 점검 중" 메시지
```

```python
async def execute_with_fallback(query, *args):
    """DB 쿼리 (폴백 포함)"""
    
    max_retries = 3
    
    for attempt in range(max_retries):
        try:
            return await db.execute(query, *args)
        
        except ConnectionError:
            if attempt < max_retries - 1:
                # 연결 풀 초기화 및 재시도
                await db.reconnect()
                await asyncio.sleep(1)
                continue
            
            # 모든 재시도 실패
            logger.error(f"DB 연결 실패: {query}")
            raise ServiceUnavailableError(
                "서비스가 일시적으로 이용 불가합니다. 잠시 후 다시 시도해주세요."
            )
```

### 시나리오 4: 권한/인증 오류

```
API 요청 (토큰 포함)
    ↓
[JWT 토큰 검증]
    ├─ 유효한 토큰: 요청 처리
    ├─ 만료된 토큰: refresh_token 확인
    │    ├─ refresh_token 유효: 새 access_token 발급
    │    └─ refresh_token 만료: 재로그인 필요
    └─ 유효하지 않은 토큰: 401 Unauthorized
```

```python
@router.post("/auth/refresh")
async def refresh_token(request: RefreshRequest):
    """토큰 갱신"""
    
    # Refresh Token 검증
    try:
        payload = jwt.decode(
            request.refresh_token,
            settings.SECRET_KEY,
            algorithms=['HS256']
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="갱신 토큰이 만료되었습니다. 재로그인해주세요."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="유효하지 않은 토큰입니다."
        )
    
    # 새 Access Token 발급
    new_access_token = create_access_token(payload['sub'])
    
    return {
        "access_token": new_access_token,
        "token_type": "Bearer",
        "expires_in": 3600
    }
```

---

**문서 버전**: 1.0  
**작성일**: 2024-05-24  
**수정일**: 2024-05-24
