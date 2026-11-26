import { describe, it, expect } from 'vitest'
import {
  ELECTRICAL_HISTORY_MS,
  ELECTRICAL_MAX_WINDOW_MS,
  electricalBucketForWindow,
  electricalTickStepForWindow,
  electricalYAxisScale,
  formatWindowDuration,
  parseWindowInput,
  RAW_GAP_THRESHOLD_MS,
  sliceWindow,
  bucketElectricalPoints,
  buildAxisTicks,
  formatRecentAxisTick,
  insertElectricalGaps,
  findNodeChanges,
  findLampOnRanges,
  summarizeMetric,
  toElectricalPoint,
  findBackfillRanges,
  type ElectricalPoint,
} from '../../utils/iot/electricalSeries'

const makePoint = (opts: Partial<ElectricalPoint> & { time: number }): ElectricalPoint => ({
  key: opts.key ?? `srv-1:${opts.cursor ?? 1}`,
  cursor: opts.cursor ?? 1,
  time: opts.time,
  current: opts.current ?? null,
  voltage: opts.voltage ?? null,
  power: opts.power ?? null,
  lamp: opts.lamp ?? null,
  node: opts.node ?? null,
  measuredAt: opts.measuredAt ?? opts.time,
  receivedAt: opts.receivedAt ?? opts.time,
  reception: opts.reception ?? 'live',
})

describe('electricalSeries', () => {
  describe('độ dài khung xem', () => {
    const MIN = 60_000
    const HOUR = 3_600_000

    it('ELECTRICAL_HISTORY_MS và khung dài nhất là 24 giờ', () => {
      expect(ELECTRICAL_HISTORY_MS).toBe(86_400_000)
      expect(ELECTRICAL_MAX_WINDOW_MS).toBe(86_400_000)
    })

    it('electricalBucketForWindow giữ đúng ngưỡng cũ của 1h, 6h, 12h', () => {
      expect(electricalBucketForWindow(15 * MIN)).toEqual({ bucketMs: 0, hint: 'Từng mẫu (mỗi giây một mẫu)' })
      expect(electricalBucketForWindow(HOUR).bucketMs).toBe(0)
      expect(electricalBucketForWindow(90 * MIN)).toEqual({ bucketMs: 60_000, hint: 'Trung bình mỗi phút' })
      expect(electricalBucketForWindow(6 * HOUR).bucketMs).toBe(60_000)
      expect(electricalBucketForWindow(12 * HOUR)).toEqual({ bucketMs: 300_000, hint: 'Trung bình mỗi 5 phút' })
    })

    it('electricalTickStepForWindow chọn bước nhỏ nhất cho tối đa 8 khoảng', () => {
      expect(electricalTickStepForWindow(5 * MIN)).toBe(MIN)
      expect(electricalTickStepForWindow(15 * MIN)).toBe(2 * MIN)
      expect(electricalTickStepForWindow(HOUR)).toBe(10 * MIN)
      expect(electricalTickStepForWindow(6 * HOUR)).toBe(HOUR)
      expect(electricalTickStepForWindow(12 * HOUR)).toBe(2 * HOUR)
      expect(electricalTickStepForWindow(24 * HOUR)).toBe(3 * HOUR)
    })

    it('formatWindowDuration', () => {
      expect(formatWindowDuration(5 * MIN)).toBe('5 phút')
      expect(formatWindowDuration(45 * MIN)).toBe('45 phút')
      expect(formatWindowDuration(HOUR)).toBe('1 giờ')
      expect(formatWindowDuration(90 * MIN)).toBe('1 giờ 30 phút')
      expect(formatWindowDuration(24 * HOUR)).toBe('24 giờ')
    })

    it('parseWindowInput nhận phút, giờ thập phân và từ chối ngoài [5 phút, max]', () => {
      const max = 24 * HOUR
      expect(parseWindowInput('90', 'minute', max)).toBe(90 * MIN)
      expect(parseWindowInput(' 1,5 ', 'hour', max)).toBe(90 * MIN)
      expect(parseWindowInput('5', 'minute', max)).toBe(5 * MIN)
      expect(parseWindowInput('24', 'hour', max)).toBe(max)
      expect(parseWindowInput('2', 'minute', max)).toBeNull()
      expect(parseWindowInput('25', 'hour', max)).toBeNull()
      expect(parseWindowInput('', 'minute', max)).toBeNull()
      expect(parseWindowInput('abc', 'minute', max)).toBeNull()
      expect(parseWindowInput('-10', 'minute', max)).toBeNull()
    })
  })

  describe('electricalYAxisScale (thang trục Y theo mẫu trong khung)', () => {
    const pts = (values: (number | null)[]) => values.map((power, i) => makePoint({ time: i * 1000, power }))

    it('khung không có mẫu thì trả null', () => {
      expect(electricalYAxisScale([], 'power')).toBeNull()
      expect(electricalYAxisScale(pts([null, null]), 'power')).toBeNull()
    })

    it('0–465 mW thành 0–500, không đẩy lên 600', () => {
      expect(electricalYAxisScale(pts([0, 442.1, 465.7]), 'power')).toEqual({
        domain: [0, 500],
        ticks: [0, 100, 200, 300, 400, 500],
        digits: 0,
      })
    })

    it('chỉ dao động 420–465 thì trục bám sát 420–470, không kéo về 0', () => {
      const scale = electricalYAxisScale(pts([421.3, 465.7, 440]), 'power')!
      expect(scale.domain).toEqual([420, 470])
      expect(scale.ticks.length).toBeLessThanOrEqual(7)
    })

    it('điện áp quanh 5 V có số lẻ và mọi mẫu bằng nhau vẫn có khoảng', () => {
      const v = (values: number[]) => values.map((voltage, i) => makePoint({ time: i * 1000, voltage }))
      const scale = electricalYAxisScale(v([5.08, 5.104, 5.12]), 'voltage')!
      expect(scale.domain[0]).toBeLessThanOrEqual(5.08)
      expect(scale.domain[1]).toBeGreaterThanOrEqual(5.12)
      expect(scale.digits).toBeGreaterThan(0)

      const flat = electricalYAxisScale(v([5, 5]), 'voltage')!
      expect(flat.domain[0]).toBeLessThan(5)
      expect(flat.domain[1]).toBeGreaterThan(5)
      expect(electricalYAxisScale(pts([0, 0]), 'power')!.domain[0]).toBe(0)
    })
  })

  describe('sliceWindow', () => {
    it('mảng rỗng trả về rỗng', () => {
      expect(sliceWindow([], 3600_000)).toEqual([])
    })

    it('giữ các điểm có time >= newest - windowMs và giữ nguyên thứ tự', () => {
      const points = [
        makePoint({ time: 1000 }),
        makePoint({ time: 5000 }),
        makePoint({ time: 7000 }),
        makePoint({ time: 10_000 }),
      ]
      // newest = 10_000, windowMs = 4000 => cutoff = 6000 => giữ 7000 và 10000
      const sliced = sliceWindow(points, 4000)
      expect(sliced.map((p) => p.time)).toEqual([7000, 10_000])
    })

    it('giữ toàn bộ nếu tất cả điểm đều nằm trong khoảng', () => {
      const points = [
        makePoint({ time: 2000 }),
        makePoint({ time: 3000 }),
      ]
      expect(sliceWindow(points, 5000).length).toBe(2)
    })
  })

  describe('bucketElectricalPoints', () => {
    it('bucketMs <= 0: trả nguyên mẫu kèm count = 1, min = max = giá trị chính điểm đó', () => {
      const p = makePoint({ time: 1000, power: 120, current: 25, voltage: 220 })
      const res = bucketElectricalPoints([p], 0)
      expect(res.length).toBe(1)
      expect(res[0].count).toBe(1)
      expect(res[0].power).toBe(120)
      expect(res[0].min).toEqual({ power: 120, current: 25, voltage: 220 })
      expect(res[0].max).toEqual({ power: 120, current: 25, voltage: 220 })
      expect(res[0].min).not.toBe(res[0].max)
    })

    it('bucketMs > 0: tính trung bình, min, max cho từng chỉ số trong nhóm', () => {
      const points = [
        makePoint({ time: 60_010, power: 100, current: 10, voltage: 210, cursor: 1 }),
        makePoint({ time: 60_020, power: 300, current: 30, voltage: 230, cursor: 2 }),
      ]
      const res = bucketElectricalPoints(points, 60_000)
      expect(res.length).toBe(1)
      expect(res[0].time).toBe(60_000)
      expect(res[0].count).toBe(2)
      expect(res[0].cursor).toBe(2)
      expect(res[0].power).toBe(200)
      expect(res[0].current).toBe(20)
      expect(res[0].voltage).toBe(220)
      expect(res[0].min).toEqual({ power: 100, current: 10, voltage: 210 })
      expect(res[0].max).toEqual({ power: 300, current: 30, voltage: 230 })
    })

    it('nhóm có giá trị null: bỏ qua null khi tính min/max/avg', () => {
      const points = [
        makePoint({ time: 60_010, power: 100, current: null, voltage: 220 }),
        makePoint({ time: 60_020, power: null, current: 20, voltage: 225 }),
        makePoint({ time: 60_030, power: 200, current: 40, voltage: null }),
      ]
      const res = bucketElectricalPoints(points, 60_000)
      expect(res.length).toBe(1)
      expect(res[0].power).toBe(150)
      expect(res[0].current).toBe(30)
      expect(res[0].voltage).toBe(222.5)
      expect(res[0].min).toEqual({ power: 100, current: 20, voltage: 220 })
      expect(res[0].max).toEqual({ power: 200, current: 40, voltage: 225 })
    })

    it('nhóm toàn null: min, max, avg đều là null', () => {
      const points = [
        makePoint({ time: 60_010, power: null, current: null, voltage: null }),
        makePoint({ time: 60_020, power: null, current: null, voltage: null }),
      ]
      const res = bucketElectricalPoints(points, 60_000)
      expect(res.length).toBe(1)
      expect(res[0].power).toBeNull()
      expect(res[0].current).toBeNull()
      expect(res[0].voltage).toBeNull()
      expect(res[0].min).toEqual({ power: null, current: null, voltage: null })
      expect(res[0].max).toEqual({ power: null, current: null, voltage: null })
    })
  })

  describe('findNodeChanges', () => {
    it('mảng rỗng hoặc cùng một node: không có mốc đổi node', () => {
      expect(findNodeChanges([])).toEqual([])
      expect(
        findNodeChanges([
          makePoint({ time: 1000, node: 'NODE-A' }),
          makePoint({ time: 2000, node: 'NODE-A' }),
        ])
      ).toEqual([])
    })

    it('đổi node 2 lần và có node null xen giữa: bỏ qua node null và bắt đúng mốc đổi', () => {
      const points = [
        makePoint({ time: 1000, node: 'NODE-A' }),
        makePoint({ time: 1500, node: null }),
        makePoint({ time: 2000, node: 'NODE-B' }),
        makePoint({ time: 2500, node: 'NODE-B' }),
        makePoint({ time: 3000, node: 'NODE-C' }),
      ]
      const changes = findNodeChanges(points)
      expect(changes).toEqual([
        { time: 2000, from: 'NODE-A', to: 'NODE-B' },
        { time: 3000, from: 'NODE-B', to: 'NODE-C' },
      ])
    })

    it('bắt đầu bằng node null thì bỏ qua cho tới khi gặp node đầu tiên', () => {
      const points = [
        makePoint({ time: 500, node: null }),
        makePoint({ time: 1000, node: 'NODE-A' }),
        makePoint({ time: 2000, node: 'NODE-B' }),
      ]
      expect(findNodeChanges(points)).toEqual([
        { time: 2000, from: 'NODE-A', to: 'NODE-B' },
      ])
    })
  })

  describe('findLampOnRanges', () => {
    it('mảng rỗng hoặc không có đèn bật: trả về []', () => {
      expect(findLampOnRanges([])).toEqual([])
      expect(
        findLampOnRanges([
          makePoint({ time: 1000, lamp: 'OFF' }),
          makePoint({ time: 2000, lamp: null }),
        ])
      ).toEqual([])
    })

    it('gom đúng 2 khoảng bật (không phân biệt hoa thường), khoảng thứ hai ở cuối mảng', () => {
      const points = [
        makePoint({ time: 1000, lamp: 'OFF' }),
        makePoint({ time: 2000, lamp: 'ON' }),
        makePoint({ time: 3000, lamp: 'on' }),
        makePoint({ time: 4000, lamp: 'OFF' }),
        makePoint({ time: 5000, lamp: 'ON' }),
        makePoint({ time: 6000, lamp: 'ON' }),
      ]
      const ranges = findLampOnRanges(points)
      expect(ranges).toEqual([
        { start: 2000, end: 4000 },
        { start: 5000, end: 6000 },
      ])
    })

    it('khoảng bật chỉ gồm 1 điểm ở cuối mảng có start = end = time điểm đó', () => {
      const points = [
        makePoint({ time: 1000, lamp: 'OFF' }),
        makePoint({ time: 2000, lamp: 'ON' }),
      ]
      expect(findLampOnRanges(points)).toEqual([
        { start: 2000, end: 2000 },
      ])
    })

    it('lamp null cắt khoảng bật', () => {
      const points = [
        makePoint({ time: 1000, lamp: 'ON' }),
        makePoint({ time: 2000, lamp: null }),
        makePoint({ time: 3000, lamp: 'ON' }),
        makePoint({ time: 4000, lamp: 'OFF' }),
      ]
      expect(findLampOnRanges(points)).toEqual([
        { start: 1000, end: 2000 },
        { start: 3000, end: 4000 },
      ])
    })
  })

  describe('summarizeMetric', () => {
    it('mảng rỗng hoặc toàn null trả về null', () => {
      expect(summarizeMetric([], 'power')).toBeNull()
      expect(
        summarizeMetric(
          [makePoint({ time: 1000, power: null }), makePoint({ time: 2000, power: null })],
          'power'
        )
      ).toBeNull()
    })

    it('tính avg, min, max bỏ qua các giá trị null', () => {
      const points = [
        makePoint({ time: 1000, power: 100, current: 10, voltage: 220 }),
        makePoint({ time: 2000, power: null, current: 20, voltage: 230 }),
        makePoint({ time: 3000, power: 300, current: null, voltage: 210 }),
      ]
      expect(summarizeMetric(points, 'power')).toEqual({
        avg: 200,
        min: 100,
        max: 300,
      })
      expect(summarizeMetric(points, 'current')).toEqual({
        avg: 15,
        min: 10,
        max: 20,
      })
      expect(summarizeMetric(points, 'voltage')).toEqual({
        avg: 220,
        min: 210,
        max: 230,
      })
    })
  })

  describe('insertElectricalGaps', () => {
    it('mảng rỗng hoặc 1 điểm trả về bản sao không chèn điểm ngắt', () => {
      expect(insertElectricalGaps([], 0)).toEqual([])
      const single = bucketElectricalPoints([makePoint({ time: 10_000, power: 500 })], 0)
      const res = insertElectricalGaps(single, 0)
      expect(res).toEqual(single)
      expect(res).not.toBe(single)
    })

    it('chế độ 1h (bucketMs = 0): ngưỡng 30 giây — <= 30s không chèn, > 30s chèn điểm ngắt null ở giữa', () => {
      expect(RAW_GAP_THRESHOLD_MS).toBe(30_000)
      const pts = bucketElectricalPoints(
        [
          makePoint({ time: 100_000, power: 500, current: 100, voltage: 5 }),
          makePoint({ time: 130_000, power: 510, current: 102, voltage: 5 }),
          makePoint({ time: 200_000, power: 520, current: 104, voltage: 5 }),
        ],
        0
      )
      const originalSnapshot = pts.map((p) => p.time)
      const res = insertElectricalGaps(pts, 0)

      // Không làm biến đổi mảng đầu vào
      expect(pts.map((p) => p.time)).toEqual(originalSnapshot)
      // 100_000 -> 130_000 (= 30s): giữ liền; 130_000 -> 200_000 (70s > 30s): chèn 1 điểm ngắt tại 165_000
      expect(res.length).toBe(4)
      expect(res.map((p) => p.time)).toEqual([100_000, 130_000, 165_000, 200_000])
      expect(res[2].count).toBe(0)
      expect(res[2].power).toBeNull()
      expect(res[2].current).toBeNull()
      expect(res[2].voltage).toBeNull()
      expect(res[2].min).toEqual({ power: null, current: null, voltage: null })
      expect(res[2].max).toEqual({ power: null, current: null, voltage: null })
    })

    it('chế độ gom ô (bucketMs > 0): ngưỡng 2 lần bucketMs — đúng bằng ngưỡng không chèn, lớn hơn thì chèn', () => {
      const bucketMs = 60_000
      const pts = bucketElectricalPoints(
        [
          makePoint({ time: 60_000, power: 400 }),
          makePoint({ time: 180_000, power: 410 }), // cách 120_000 (= 2 * bucketMs) -> không chèn
          makePoint({ time: 420_000, power: 420 }), // cách 240_000 (> 2 * bucketMs) -> chèn tại 300_000
        ],
        bucketMs
      )
      const res = insertElectricalGaps(pts, bucketMs)
      expect(res.map((p) => p.time)).toEqual([60_000, 180_000, 300_000, 420_000])
      expect(res[2].power).toBeNull()
      expect(res[2].min.power).toBeNull()
      expect(res[2].max.power).toBeNull()
      expect(res[2].count).toBe(0)
    })
  })

  describe('formatRecentAxisTick & buildAxisTicks (nhãn 2 dòng trục X chế độ Gần nhất)', () => {
    it('khung 6 giờ qua nửa đêm (21:00 hôm trước → 03:00 hôm sau): chỉ nhãn đầu và mốc 00:00 có dòng ngày', () => {
      const start = new Date(2026, 10, 23, 21, 0, 0).getTime() // 23/11 21:00 giờ địa phương
      const end = new Date(2026, 10, 24, 3, 0, 0).getTime()    // 24/11 03:00 giờ địa phương
      const ticks = buildAxisTicks(start, end, 3_600_000)

      const formatted = ticks.map((t, idx) => formatRecentAxisTick(t, idx === 0))
      expect(formatted).toEqual([
        { clock: '21:00', date: '23/11' },
        { clock: '22:00', date: null },
        { clock: '23:00', date: null },
        { clock: '00:00', date: '24/11' },
        { clock: '01:00', date: null },
        { clock: '02:00', date: null },
        { clock: '03:00', date: null },
      ])
    })

    it('khung 6 giờ không qua nửa đêm (08:30 → 14:30): chỉ nhãn đầu khung (09:00) có dòng ngày', () => {
      const start = new Date(2026, 10, 24, 8, 30, 0).getTime()
      const end = new Date(2026, 10, 24, 14, 30, 0).getTime()
      const ticks = buildAxisTicks(start, end, 3_600_000)

      const formatted = ticks.map((t, idx) => formatRecentAxisTick(t, idx === 0))
      expect(formatted).toEqual([
        { clock: '09:00', date: '24/11' },
        { clock: '10:00', date: null },
        { clock: '11:00', date: null },
        { clock: '12:00', date: null },
        { clock: '13:00', date: null },
        { clock: '14:00', date: null },
      ])
    })

    it('mốc 00:00 luôn hiển thị ngày dù là nhãn đầu hay nằm giữa khung', () => {
      const midnight = new Date(2026, 10, 24, 0, 0, 0).getTime()
      expect(formatRecentAxisTick(midnight, true)).toEqual({ clock: '00:00', date: '24/11' })
      expect(formatRecentAxisTick(midnight, false)).toEqual({ clock: '00:00', date: '24/11' })
    })
  })

  describe('reception_type (live / backfill)', () => {
    const raw = {
      node_id: 'NODE-001',
      measured_at: '2026-11-25T07:59:58Z',
      received_at: '2026-11-25T08:05:00Z',
      voltage: 5,
      current_ma: 95,
      power_mw: 475,
      lamp_command: 'ON',
    }

    it('giữ giờ đo, giờ nhận và loại nhận; xếp theo giờ đo mặc định', () => {
      const p = toElectricalPoint({ ...raw, reception_type: 'backfill' })
      expect(p?.time).toBe(Date.parse(raw.measured_at))
      expect(p?.measuredAt).toBe(Date.parse(raw.measured_at))
      expect(p?.receivedAt).toBe(Date.parse(raw.received_at))
      expect(p?.reception).toBe('backfill')
      expect(p?.power).toBe(475)
    })

    it('xếp theo giờ nhận khi timeBasis = received_at; thiếu giờ đo thì bỏ ở chế độ giờ đo', () => {
      expect(toElectricalPoint(raw, 'received_at')?.time).toBe(Date.parse(raw.received_at))
      expect(toElectricalPoint({ ...raw, measured_at: null })).toBeNull()
      expect(toElectricalPoint({ ...raw, measured_at: null }, 'received_at')?.measuredAt).toBeNull()
    })

    it('reception_type null (firmware cũ) → reception null', () => {
      expect(toElectricalPoint({ ...raw, reception_type: null })?.reception).toBeNull()
    })

    it('đếm mẫu gửi bù trong ô gom và tính khoảng giờ đo / giờ nhận', () => {
      const t = Date.parse('2026-11-25T08:00:00Z')
      const pts = [
        makePoint({ time: t + 1_000, key: 'a', reception: 'live', measuredAt: t + 1_000, receivedAt: t + 2_000 }),
        makePoint({ time: t + 5_000, key: 'b', reception: 'backfill', measuredAt: t + 5_000, receivedAt: t + 90_000 }),
      ]
      const [b] = bucketElectricalPoints(pts, 60_000)
      expect(b.count).toBe(2)
      expect(b.backfillCount).toBe(1)
      expect(b.measuredFrom).toBe(t + 1_000)
      expect(b.measuredTo).toBe(t + 5_000)
      expect(b.receivedFrom).toBe(t + 2_000)
      expect(b.receivedTo).toBe(t + 90_000)
    })

    it('findBackfillRanges gom các điểm gửi bù liền kề thành khoảng, điểm live cắt khoảng', () => {
      const mk = (time: number, reception: 'live' | 'backfill') => makePoint({ time, key: String(time), reception })
      const series = bucketElectricalPoints(
        [mk(0, 'live'), mk(1_000, 'backfill'), mk(2_000, 'backfill'), mk(3_000, 'live'), mk(4_000, 'backfill')],
        0
      )
      expect(findBackfillRanges(series, 0)).toEqual([
        { start: 1_000, end: 3_000 },
        { start: 4_000, end: 5_000 },
      ])
    })
  })
})
