import React, {useCallback, useMemo, useRef, useState} from 'react';
import {useFocusEffect} from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useRunning} from '../hooks/useRunning';
import {useHealthSync} from '../hooks/useHealthSync';
import {LoadingSpinner} from '@components/common/LoadingSpinner';
import {AppHeader} from '@components/common/AppHeader';
import {ThemeBackground} from '@components/common/ThemeBackground';
import {useThemeContext} from '@theme/ThemeContext';
import type {AppTheme} from '@theme/themeColors';
import {fmtKm, fmtMinPerKm, fmtElapsed} from '../utils';
import type {RunningStackParams} from '../types';

type NavProp = NativeStackNavigationProp<RunningStackParams>;

const DOW_KR        = ['일','월','화','수','목','금','토'];
const DOW_MON_START = ['월','화','수','목','금','토','일'];
const MONTH_KR      = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

// ── Hero stats (이번 주 요약 — 단 하나의 깔끔한 카드) ────────────────────────
const HeroStatsCard = ({stats, tc}: {
  stats: {count: number; totalDistKm: number; totalSeconds: number; totalCals: number};
  tc: AppTheme;
}) => (
  <View style={[hc.card, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
    <Text style={[hc.subtitle, {color: tc.textDis}]}>이번 주</Text>
    <View style={hc.mainRow}>
      <Text style={[hc.bigNum, {color: tc.emerald}]}>{stats.totalDistKm.toFixed(1)}</Text>
      <Text style={[hc.bigUnit, {color: tc.textSec}]}> km</Text>
    </View>
    <View style={hc.subRow}>
      <Text style={[hc.sub, {color: tc.textSec}]}>🏃 {stats.count}회</Text>
      <Text style={[hc.dot, {color: tc.textDis}]}> · </Text>
      <Text style={[hc.sub, {color: tc.textSec}]}>
        ⏱ {stats.totalSeconds > 0 ? fmtElapsed(stats.totalSeconds) : '--:--'}
      </Text>
      <Text style={[hc.dot, {color: tc.textDis}]}> · </Text>
      <Text style={[hc.sub, {color: tc.textSec}]}>🔥 {stats.totalCals} kcal</Text>
    </View>
  </View>
);

const hc = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 20, paddingVertical: 20,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  subtitle: {fontSize: 12, fontWeight: '600', letterSpacing: 0.8, marginBottom: 6},
  mainRow: {flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10},
  bigNum: {fontSize: 46, fontWeight: '800', lineHeight: 52},
  bigUnit: {fontSize: 20, fontWeight: '600', paddingBottom: 6},
  subRow: {flexDirection: 'row', alignItems: 'center'},
  sub: {fontSize: 13},
  dot: {fontSize: 13},
});

// ── Monthly calendar ─────────────────────────────────────────────────────────
interface CalCell {day: number | null; hasRun: boolean; isToday: boolean; isFuture: boolean}
const RING_SIZE = 30;
const CELL_H    = 42;

const MonthCalendar = ({cells, runCount, year, month, onPrev, onNext, onDayPress, tc}: {
  cells: CalCell[]; runCount: number; year: number; month: number;
  onPrev: () => void; onNext: () => void;
  onDayPress: (day: number) => void;
  tc: AppTheme;
}) => {
  const {width} = useWindowDimensions();
  const cellWidth = Math.floor((width - 64) / 7);
  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={[cal.card, {backgroundColor: tc.card, borderColor: tc.cardBorderSide}]}>
      <View style={cal.header}>
        <TouchableOpacity onPress={onPrev} hitSlop={{top:10,bottom:10,left:12,right:12}}>
          <Text style={[cal.navBtn, {color: tc.textSec}]}>‹</Text>
        </TouchableOpacity>
        <View style={cal.hCenter}>
          <Text style={[cal.monthLabel, {color: tc.textPri}]}>{year}년 {MONTH_KR[month]}</Text>
          {runCount > 0 && <Text style={[cal.runBadge, {color: tc.emerald}]}>🏃 {runCount}일 달림</Text>}
        </View>
        <TouchableOpacity onPress={onNext} hitSlop={{top:10,bottom:10,left:12,right:12}}>
          <Text style={[cal.navBtn, {color: tc.textSec}]}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={cal.dowRow}>
        {DOW_KR.map((d, i) => (
          <View key={d} style={[cal.dowCell, {width: cellWidth}]}>
            <Text style={[cal.dowLabel, {color: i===0 ? tc.error : (i===6 ? tc.teal : tc.textDis)}]}>{d}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={cal.weekRow}>
          {[...row, ...Array(7 - row.length).fill({day: null, hasRun: false, isToday: false, isFuture: true})].map((cell: CalCell, ci) => {
            if (!cell.day) return <View key={ci} style={[cal.dayCell, {width: cellWidth, height: CELL_H}]} />;
            const ringColor = cell.hasRun ? tc.emerald : (cell.isToday ? tc.emerald : (cell.isFuture ? 'transparent' : tc.track));
            const ringW     = cell.hasRun ? 2.5 : (cell.isToday ? 2 : 1.5);
            const numColor  = cell.hasRun ? tc.emerald : (cell.isToday ? tc.emerald : (cell.isFuture ? tc.textDis : tc.textSec));
            return (
              <TouchableOpacity
                key={ci}
                style={[cal.dayCell, {width: cellWidth, height: CELL_H}]}
                onPress={() => cell.hasRun && onDayPress(cell.day!)}
                activeOpacity={cell.hasRun ? 0.6 : 1}
                disabled={!cell.hasRun}>
                <View style={[cal.ring, {borderColor: ringColor, borderWidth: ringW}]}>
                  <Text style={[cal.dayNum, {color: numColor, fontWeight: (cell.hasRun || cell.isToday) ? '700' : '400'}]}>
                    {cell.day}
                  </Text>
                </View>
                {cell.isToday && <View style={[cal.todayDot, {backgroundColor: tc.emerald}]} />}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
};

const cal = StyleSheet.create({
  card: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  header: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  navBtn: {fontSize: 24, paddingHorizontal: 4, fontWeight: '300'},
  hCenter: {flex: 1, alignItems: 'center'},
  monthLabel: {fontSize: 14, fontWeight: '700'},
  runBadge: {fontSize: 11, fontWeight: '600', marginTop: 2},
  dowRow: {flexDirection: 'row', marginBottom: 4},
  dowCell: {alignItems: 'center', paddingVertical: 2},
  dowLabel: {fontSize: 10, fontWeight: '700'},
  weekRow: {flexDirection: 'row'},
  dayCell: {alignItems: 'center', justifyContent: 'center'},
  ring: {width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE/2, alignItems: 'center', justifyContent: 'center'},
  dayNum: {fontSize: 11},
  todayDot: {width: 4, height: 4, borderRadius: 2, marginTop: 2},
});

// ── Sync badge ───────────────────────────────────────────────────────────────
const SyncBadge = ({status, lastSync, tc}: {status: string; lastSync: string|null; tc: AppTheme}) => {
  if (status === 'idle' && !lastSync) return null;
  const BADGE: Record<string, {color: string; label: string}> = {
    syncing: {color: '#FB923C', label: '동기화 중...'},
    done:    {color: tc.success, label: '동기화 완료'},
    error:   {color: tc.error,   label: '동기화 실패'},
  };
  const b = BADGE[status] ?? {color: tc.textDis, label: ''};
  const t = lastSync ? new Date(lastSync).toLocaleTimeString('ko-KR', {hour:'2-digit', minute:'2-digit'}) : '';
  return (
    <View style={sy.row}>
      <View style={[sy.dot, {backgroundColor: b.color}]} />
      <Text style={[sy.text, {color: tc.textSec}]}>{b.label}{t && status==='done' ? ` · ${t}` : ''}</Text>
    </View>
  );
};
const sy = StyleSheet.create({
  row: {flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingBottom:4},
  dot: {width:7, height:7, borderRadius:4, marginRight:6},
  text: {fontSize:12},
});

const confirmDelete = (onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if ((globalThis as any).confirm?.('이 러닝 기록을 삭제하시겠습니까?')) onConfirm();
  } else {
    Alert.alert('삭제', '이 러닝 기록을 삭제하시겠습니까?', [
      {text:'취소', style:'cancel'},
      {text:'삭제', style:'destructive', onPress: onConfirm},
    ]);
  }
};

const fadeSlide = (a: Animated.Value) => ({
  opacity: a,
  transform: [{translateY: a.interpolate({inputRange:[0,1], outputRange:[20,0]})}],
});

// ── Main screen ───────────────────────────────────────────────────────────────
export const RunningListScreen = () => {
  const navigation   = useNavigation<NavProp>();
  const {tc, isDark} = useThemeContext();
  const insets       = useSafeAreaInsets();
  const {
    records, loading, syncStatus, lastSyncTime,
    fetchRecords, selectRunning, deleteRunning, addSampleRun,
  } = useRunning();
  const {syncFromHealth} = useHealthSync();

  const [syncing,      setSyncing]      = useState(false);
  const [addingSample, setAddingSample] = useState(false);
  const now = new Date();
  const [calYear,  setCalYear]  = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // ── Action sheet ─────────────────────────────────────────────────────────
  const [actionOpen, setActionOpen] = useState(false);
  const actionY   = useRef(new Animated.Value(400)).current;
  const actionOpa = useRef(new Animated.Value(0)).current;
  const fabScale  = useRef(new Animated.Value(1)).current;
  const fabRotate = useRef(new Animated.Value(0)).current;

  const openAction = () => {
    setActionOpen(true);
    Animated.parallel([
      Animated.spring(actionY,   {toValue:0,  tension:65, friction:14, useNativeDriver:true}),
      Animated.timing(actionOpa, {toValue:1,  duration:200, useNativeDriver:true}),
      Animated.spring(fabScale,  {toValue:0.88, tension:80, friction:8, useNativeDriver:true}),
      Animated.spring(fabRotate, {toValue:1,  tension:80, friction:8, useNativeDriver:true}),
    ]).start();
  };
  const closeAction = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(actionY,   {toValue:400, duration:220, useNativeDriver:true}),
      Animated.timing(actionOpa, {toValue:0,   duration:180, useNativeDriver:true}),
      Animated.spring(fabScale,  {toValue:1,   tension:80, friction:8, useNativeDriver:true}),
      Animated.spring(fabRotate, {toValue:0,   tension:80, friction:8, useNativeDriver:true}),
    ]).start(() => { setActionOpen(false); cb?.(); });
  };
  const doAction = (fn: () => void) => closeAction(fn);
  const fabRot = fabRotate.interpolate({inputRange:[0,1], outputRange:['0deg','45deg']});

  // ── Day detail sheet ─────────────────────────────────────────────────────
  const [dayRecord, setDayRecord] = useState<any>(null);
  const dayY   = useRef(new Animated.Value(400)).current;
  const dayOpa = useRef(new Animated.Value(0)).current;

  const openDay = (rec: any) => {
    setDayRecord(rec);
    Animated.parallel([
      Animated.spring(dayY,   {toValue:0,  tension:65, friction:14, useNativeDriver:true}),
      Animated.timing(dayOpa, {toValue:1,  duration:200, useNativeDriver:true}),
    ]).start();
  };
  const closeDay = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(dayY,   {toValue:400, duration:220, useNativeDriver:true}),
      Animated.timing(dayOpa, {toValue:0,   duration:180, useNativeDriver:true}),
    ]).start(() => { setDayRecord(null); cb?.(); });
  };

  const SA = useRef(Array.from({length: 3}, () => new Animated.Value(0))).current;

  useFocusEffect(
    useCallback(() => {
      fetchRecords();
      SA.forEach(a => a.setValue(0));
      const anim = Animated.stagger(80, SA.map(a =>
        Animated.spring(a, {toValue:1, tension:55, friction:8, useNativeDriver:true}),
      ));
      anim.start();
      return () => anim.stop();
    }, [fetchRecords, SA]),
  );

  // ── Computed data ─────────────────────────────────────────────────────────
  const weeklyStats = useMemo(() => {
    const d = new Date(); const dow = d.getDay();
    const monday = new Date(d); monday.setDate(d.getDate() - ((dow+6)%7)); monday.setHours(0,0,0,0);
    const wk = records.filter(r => new Date(r.date) >= monday);
    return {
      count: wk.length,
      totalDistKm: wk.reduce((s,r) => s + r.distance, 0),
      totalSeconds: wk.reduce((s,r) => s + r.duration, 0),
      totalCals: wk.reduce((s,r) => s + (r.calories??0), 0),
    };
  }, [records]);

  const calData = useMemo(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const firstWeekday = firstDay.getDay();
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    const runDays = new Set(
      records
        .filter(r => { const rd = new Date(r.date); return rd.getFullYear()===calYear && rd.getMonth()===calMonth; })
        .map(r => new Date(r.date).getDate()),
    );
    const today = new Date();
    const isCurrent = today.getFullYear()===calYear && today.getMonth()===calMonth;
    const cells: CalCell[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({day:null, hasRun:false, isToday:false, isFuture:false});
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        day: d, hasRun: runDays.has(d),
        isToday: isCurrent && d===today.getDate(),
        isFuture: new Date(calYear, calMonth, d) > today,
      });
    }
    return {cells, runCount: runDays.size};
  }, [records, calYear, calMonth]);

  const handlePrevMonth = () => { if (calMonth===0) { setCalYear(y=>y-1); setCalMonth(11); } else setCalMonth(m=>m-1); };
  const handleNextMonth = () => { if (calMonth===11) { setCalYear(y=>y+1); setCalMonth(0); } else setCalMonth(m=>m+1); };

  const handleDayPress = (day: number) => {
    const target = new Date(calYear, calMonth, day).toDateString();
    const rec = records.find(r => new Date(r.date).toDateString()===target);
    if (rec) openDay(rec);
  };

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncFromHealth(30);
      if (Platform.OS !== 'web') {
        if (['unavailable','denied','no_data','failed','error'].includes(result.status)) {
          Alert.alert('동기화', result.message ?? '동기화에 실패했습니다.');
        } else {
          Alert.alert('동기화 완료', `새로운 기록: ${result.synced}개`);
        }
      }
    } finally { setSyncing(false); }
  }, [syncFromHealth]);

  const handleAddSample = useCallback(async () => {
    setAddingSample(true);
    try { await addSampleRun(); } finally { setAddingSample(false); }
  }, [addSampleRun]);

  const handleDelete = useCallback(
    (id: string) => {
      confirmDelete(async () => {
        try { await deleteRunning(id); } catch {
          if (Platform.OS !== 'web') Alert.alert('오류', '삭제에 실패했습니다.');
        }
      });
    }, [deleteRunning],
  );

  const sheetBg    = isDark ? 'rgba(8,22,14,0.98)' : 'rgba(248,252,250,0.99)';
  const handleCol  = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.10)';
  const divCol     = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
  const fabBottom  = insets.bottom + 20;

  if (loading && records.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <ThemeBackground style={s.root}>
      <AppHeader />

      <Animated.View style={[s.list, fadeSlide(SA[2])]}>
        <FlatList
          contentContainerStyle={[s.content, {paddingBottom: insets.bottom + 110}]}
          data={records}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              <Animated.View style={fadeSlide(SA[0])}>
                <HeroStatsCard stats={weeklyStats} tc={tc} />
              </Animated.View>
              <Animated.View style={fadeSlide(SA[1])}>
                <MonthCalendar
                  cells={calData.cells} runCount={calData.runCount}
                  year={calYear} month={calMonth}
                  onPrev={handlePrevMonth} onNext={handleNextMonth}
                  onDayPress={handleDayPress} tc={tc}
                />
                <SyncBadge status={syncing ? 'syncing' : syncStatus} lastSync={lastSyncTime} tc={tc} />
                <Text style={[s.sectionTitle, {color: tc.textPri}]}>러닝 기록</Text>
              </Animated.View>
            </>
          }
          renderItem={({item}) => (
            <TouchableOpacity
              style={[s.card, {
                backgroundColor: tc.card,
                borderTopColor: tc.cardBorderTop,
                borderLeftColor: tc.cardBorderSide,
                borderRightColor: tc.cardBorderSide,
                borderBottomColor: tc.cardBorderSide,
              }]}
              activeOpacity={0.85}
              onPress={() => { selectRunning(item); navigation.navigate('RunningDetail', {recordId: item.id}); }}>
              <View style={s.cardTop}>
                <Text style={[s.cardDate, {color: tc.textSec}]}>
                  {new Date(item.date).toLocaleDateString('ko-KR', {year:'numeric', month:'long', day:'numeric'})}
                </Text>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item.id)}
                  hitSlop={{top:8,bottom:8,left:8,right:8}}>
                  <Text style={[s.deleteBtnText, {color: tc.error}]}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={s.cardStats}>
                {[
                  {val: fmtKm(item.distance),        label: '거리',   color: tc.emerald},
                  {val: fmtElapsed(item.duration),    label: '시간',   color: tc.textPri},
                  {val: fmtMinPerKm(item.avgPace),    label: '페이스', color: tc.textPri},
                  {val: String(item.calories),         label: 'kcal',   color: tc.gold},
                ].map((it, i, arr) => (
                  <React.Fragment key={i}>
                    <View style={s.statItem}>
                      <Text style={[s.statValue, {color: it.color}]}>{it.val}</Text>
                      <Text style={[s.statLabel, {color: tc.textSec}]}>{it.label}</Text>
                    </View>
                    {i < arr.length-1 && <View style={[s.statDivider, {backgroundColor: tc.divider}]} />}
                  </React.Fragment>
                ))}
              </View>
              {(item.route?.length ?? 0) > 1 && (
                <View style={[s.routeRow, {borderTopColor: tc.divider}]}>
                  <Text style={[s.routeText, {color: tc.textDis}]}>📍 {item.route?.length ?? 0}개 GPS 포인트</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>🏃‍♂️</Text>
                <Text style={[s.emptyText, {color: tc.textSec}]}>아직 러닝 기록이 없습니다.</Text>
                <Text style={[s.emptySubText, {color: tc.textDis}]}>아래 + 버튼을 눌러 시작해보세요!</Text>
              </View>
            ) : null
          }
        />
      </Animated.View>

      {/* ── 중앙 FAB ───────────────────────────────────────────────────────── */}
      <View style={[s.fabWrap, {bottom: fabBottom}]} pointerEvents="box-none">
        <Animated.View style={{transform: [{scale: fabScale}]}}>
          <TouchableOpacity
            style={[s.fab, {backgroundColor: tc.teal, shadowColor: tc.emerald}]}
            onPress={() => actionOpen ? closeAction() : openAction()}
            activeOpacity={0.88}>
            <Animated.Text style={[s.fabIcon, {transform: [{rotate: fabRot}]}]}>+</Animated.Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* ── Action sheet ───────────────────────────────────────────────────── */}
      <Modal visible={actionOpen} transparent animationType="none" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => closeAction()}>
          <Animated.View style={[s.backdrop, {opacity: actionOpa}]} />
        </TouchableWithoutFeedback>

        <Animated.View style={[s.sheet, {backgroundColor: sheetBg, transform: [{translateY: actionY}]}]}>
          <View style={[s.handle, {backgroundColor: handleCol}]} />

          {/* 러닝 시작 — 주 버튼 */}
          <TouchableOpacity
            style={[s.primaryBtn, {backgroundColor: tc.teal}]}
            onPress={() => doAction(() => navigation.navigate('RunningTracker'))}
            activeOpacity={0.85}>
            <Text style={s.primaryEmoji}>🏃</Text>
            <Text style={[s.primaryLabel, {color: tc.textInverse}]}>러닝 시작</Text>
            <Text style={[s.primaryArrow, {color: 'rgba(255,255,255,0.5)'}]}>›</Text>
          </TouchableOpacity>

          <View style={[s.div, {backgroundColor: divCol}]} />

          {[
            {emoji:'🏆', label:'리더보드',               fn:() => navigation.navigate('Leaderboard')},
            {emoji:'🗺️', label:'코스 추천',               fn:() => navigation.navigate('RunningCourses')},
            {emoji:'📊', label:'러닝 통계',               fn:() => navigation.navigate('RunningStats')},
            {emoji:'🔄', label:'Health Connect 동기화',   fn:() => handleSync(), dim: syncing},
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={[s.menuItem, {opacity: item.dim ? 0.4 : 1}]}
              onPress={() => doAction(item.fn)}
              disabled={item.dim}
              activeOpacity={0.65}>
              <Text style={s.menuEmoji}>{item.emoji}</Text>
              <Text style={[s.menuLabel, {color: tc.textPri}]}>{item.label}</Text>
              <Text style={[s.menuArrow, {color: tc.textDis}]}>›</Text>
            </TouchableOpacity>
          ))}

          <View style={[s.div, {backgroundColor: divCol}]} />
          <TouchableOpacity
            style={[s.sampleRow, {opacity: addingSample ? 0.4 : 1}]}
            onPress={() => doAction(handleAddSample)}
            disabled={addingSample}
            activeOpacity={0.65}>
            <Text style={[s.sampleText, {color: tc.textDis}]}>
              🧪 {addingSample ? '추가 중...' : '샘플 기록 추가'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      {/* ── Day detail sheet ────────────────────────────────────────────────── */}
      <Modal visible={!!dayRecord} transparent animationType="none" statusBarTranslucent>
        <TouchableWithoutFeedback onPress={() => closeDay()}>
          <Animated.View style={[s.backdrop, {opacity: dayOpa}]} />
        </TouchableWithoutFeedback>

        {dayRecord && (
          <Animated.View style={[s.sheet, s.daySheet, {backgroundColor: sheetBg, transform: [{translateY: dayY}]}]}>
            <View style={[s.handle, {backgroundColor: handleCol}]} />
            <Text style={[s.dayTitle, {color: tc.textPri}]}>
              {new Date(dayRecord.date).toLocaleDateString('ko-KR', {month:'long', day:'numeric', weekday:'short'})}
            </Text>
            <View style={[s.dayStats, {borderColor: tc.divider}]}>
              {[
                {val: fmtKm(dayRecord.distance),     label:'거리',   color:tc.emerald},
                {val: fmtElapsed(dayRecord.duration), label:'시간',   color:tc.textPri},
                {val: fmtMinPerKm(dayRecord.avgPace), label:'페이스', color:tc.textPri},
                {val: String(dayRecord.calories),     label:'kcal',   color:tc.gold},
              ].map((it, i, arr) => (
                <React.Fragment key={i}>
                  <View style={s.dayStatItem}>
                    <Text style={[s.dayStatVal, {color: it.color}]}>{it.val}</Text>
                    <Text style={[s.dayStatLabel, {color: tc.textSec}]}>{it.label}</Text>
                  </View>
                  {i < arr.length-1 && <View style={[s.statDivider, {backgroundColor: tc.divider}]} />}
                </React.Fragment>
              ))}
            </View>
            {dayRecord.route?.length > 1 && (
              <Text style={[s.dayGps, {color: tc.textDis}]}>📍 GPS {dayRecord.route.length}포인트 기록됨</Text>
            )}
            <TouchableOpacity
              style={[s.dayBtn, {backgroundColor: tc.teal}]}
              onPress={() => closeDay(() => { selectRunning(dayRecord); navigation.navigate('RunningDetail', {recordId: dayRecord.id}); })}
              activeOpacity={0.85}>
              <Text style={[s.dayBtnText, {color: tc.textInverse}]}>자세히 보기</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Modal>
    </ThemeBackground>
  );
};

const s = StyleSheet.create({
  root: {flex: 1},
  list: {flex: 1},
  content: {paddingTop: 4},

  sectionTitle: {fontSize: 15, fontWeight: '700', letterSpacing: 0.3, paddingHorizontal: 16, paddingBottom: 8, paddingTop: 4},

  card: {
    borderRadius: 16, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1,
    marginHorizontal: 16, marginBottom: 10, padding: 16,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  cardTop: {flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12},
  cardDate: {fontSize:13},
  deleteBtn: {width:26, height:26, borderRadius:13, backgroundColor:'rgba(248,113,113,0.12)', alignItems:'center', justifyContent:'center'},
  deleteBtnText: {fontSize:12, fontWeight:'700'},
  cardStats: {flexDirection:'row', alignItems:'center'},
  statItem: {flex:1, alignItems:'center'},
  statValue: {fontSize:15, fontWeight:'700'},
  statLabel: {fontSize:11, marginTop:2},
  statDivider: {width:1, height:30},
  routeRow: {marginTop:10, paddingTop:8, borderTopWidth:1},
  routeText: {fontSize:11},

  emptyWrap: {alignItems:'center', paddingTop:40},
  emptyEmoji: {fontSize:52, marginBottom:16},
  emptyText: {fontSize:16, fontWeight:'600'},
  emptySubText: {fontSize:13, marginTop:8, textAlign:'center'},

  // ── FAB (중앙) ──────────────────────────────────────────────────────────
  fabWrap: {
    position: 'absolute',
    left: 0, right: 0,
    alignItems: 'center',
    pointerEvents: 'box-none',
  } as any,
  fab: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.38, shadowRadius: 14, elevation: 10,
  },
  fabIcon: {fontSize: 32, color: '#fff', lineHeight: 38, includeFontPadding: false},

  // ── Shared sheet ─────────────────────────────────────────────────────────
  backdrop: {...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.48)'},
  sheet: {
    position:'absolute', left:0, right:0, bottom:0,
    borderTopLeftRadius:26, borderTopRightRadius:26,
    paddingBottom:32,
    shadowColor:'#000', shadowOffset:{width:0,height:-4}, shadowOpacity:0.18, shadowRadius:16, elevation:16,
  },
  daySheet: {paddingBottom:28},
  handle: {width:40, height:4, borderRadius:2, alignSelf:'center', marginTop:12, marginBottom:16},
  div: {height:1, marginHorizontal:16, marginVertical:4},

  // Action sheet
  primaryBtn: {
    flexDirection:'row', alignItems:'center',
    marginHorizontal:16, borderRadius:16,
    paddingVertical:16, paddingHorizontal:18, marginBottom:6,
  },
  primaryEmoji: {fontSize:20, marginRight:12},
  primaryLabel: {flex:1, fontSize:16, fontWeight:'700'},
  primaryArrow: {fontSize:22},
  menuItem: {flexDirection:'row', alignItems:'center', paddingHorizontal:20, paddingVertical:14},
  menuEmoji: {fontSize:18, width:32},
  menuLabel: {flex:1, fontSize:15},
  menuArrow: {fontSize:18},
  sampleRow: {paddingVertical:12, alignItems:'center'},
  sampleText: {fontSize:13},

  // Day detail
  dayTitle: {fontSize:17, fontWeight:'700', paddingHorizontal:20, marginBottom:14},
  dayStats: {
    flexDirection:'row', alignItems:'center',
    borderTopWidth:1, borderBottomWidth:1,
    paddingVertical:16, marginHorizontal:16, marginBottom:12,
  },
  dayStatItem: {flex:1, alignItems:'center'},
  dayStatVal: {fontSize:17, fontWeight:'800'},
  dayStatLabel: {fontSize:11, marginTop:4},
  dayGps: {fontSize:12, textAlign:'center', marginBottom:14},
  dayBtn: {marginHorizontal:16, borderRadius:14, paddingVertical:14, alignItems:'center'},
  dayBtnText: {fontSize:15, fontWeight:'700'},
});
