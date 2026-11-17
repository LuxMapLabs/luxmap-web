import { describe, it, expect } from 'vitest'
import {
  ELECTRICAL_RANGES,
  ELECTRICAL_RANGE_KEYS,
  ELECTRICAL_HISTORY_MS,
  sliceWindow,
  bucketElectricalPoints,
  findNodeChanges,
  findLampOnRanges,
  summarizeMetric,
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
})

describe('electricalSeries', () => {
  describe('ELECTRICAL_RANGES', () => {
    it('định nghĩa đủ 3 khoảng 1h, 6h, 24h và ELECTRICAL_HISTORY_MS là 24h', () => {
      expect(ELECTRICAL_RANGE_KEYS).toEqual(['1h', '6h', '24h'])
      expect(ELECTRICAL_RANGES['1h'].windowMs).toBe(3_600_000)
      expect(ELECTRICAL_RANGES['1h'].bucketMs).toBe(0)
      expect(ELECTRICAL_RANGES['6h'].windowMs).toBe(21_600_000)
      expect(ELECTRICAL_RANGES['6h'].bucketMs).toBe(60_000)
      expect(ELECTRICAL_RANGES['24h'].windowMs).toBe(86_400_000)
      expect(ELECTRICAL_RANGES['24h'].bucketMs).toBe(300_000)
      expect(ELECTRICAL_HISTORY_MS).toBe(86_400_000)
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
})
