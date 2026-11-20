import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../redux/rootReducer'
import { EditPoleModal } from '../../pages/assets/components/poles/components/EditPoleModal'
import {
  clampToCorridor,
  diffRouteLines,
  spurLines,
  type EditPoleMapProps,
} from '../../pages/assets/components/poles/components/EditPoleMap'
import { fetchSegmentDetailSuccess } from '../../feature/assets/assetSlice'
import { calculateDistanceMeters, snapPointToPolyline } from '../../utils/gis-map/routeUtils'
import { ROUTE_CORRIDOR_M } from '../../utils/gis-map/poleMove'
import type { PoleListItem } from '../../types/assets/poles'
import type { SegmentListItem } from '../../types/assets/segments'

vi.mock('../../hooks/useShowCommune', () => ({ useShowCommune: () => false }))
const mapPropsHolder: { current: EditPoleMapProps | null } = { current: null }
const getLatestMapProps = (): EditPoleMapProps | null => mapPropsHolder.current
// Bản đồ MapLibre không chạy được trong jsdom; giữ nguyên hàm thuần clampToCorridor để test
vi.mock('../../pages/assets/components/poles/components/EditPoleMap', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../pages/assets/components/poles/components/EditPoleMap')
    >()
  return {
    ...actual,
    EditPoleMap: (props: EditPoleMapProps) => {
      mapPropsHolder.current = props
      return <div data-testid="edit-pole-map" />
    },
  }
})

const segment: SegmentListItem = {
  segment_id: 'SEG-003',
  external_ref: 'osm-way-1',
  segment_name: 'Tuyến B',
  road_class: 'inter_village',
  length_m: 330,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  pole_count: 3,
  has_geometry: true,
  updated_at: '2026-11-15T00:00:00Z',
}

const pole = (id: string, lng: number, lat = 10.8): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: 'SEG-003',
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat, lng },
  updated_at: '2026-11-15T00:00:00Z',
})

// Hình theo con đường: chạy song song cách cột ~10 m về phía bắc
const ROAD =
  'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
const JOINED = 'LINESTRING(106.8 10.8, 106.801 10.8, 106.802 10.8)'

const open = (editing: PoleListItem, geomWkt: string) => {
  const all = [pole('POLE-0001', 106.8), editing, pole('POLE-0003', 106.802)]
  const store = configureStore({ reducer: rootReducer })
  const onSave = vi.fn()
  render(
    <Provider store={store}>
      <EditPoleModal
        isOpen
        pole={editing}
        segments={[segment]}
        allPoles={all}
        onClose={vi.fn()}
        onSave={onSave}
      />
    </Provider>
  )
  act(() => {
    store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-003', geomWkt }))
  })
  return onSave
}

const setLat = (value: string) => {
  const input = screen.getByPlaceholderText('VD: 10.970187')
  fireEvent.change(input, { target: { value } })
  fireEvent.blur(input)
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }))

describe('Sửa cột trên tuyến đã có hình theo con đường', () => {
  it('dời cột ra xa hình quá 25 m: cảnh báo ngay và chặn lưu', () => {
    const onSave = open(pole('POLE-0002', 106.801), ROAD)

    setLat('10.8005')
    expect(screen.getByRole('alert')).toHaveTextContent(/Cột cách hình tuyến 45,\d m, quá 25 m/)

    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/1 cột nằm cách hình tuyến quá 25 m \(POLE-0002\)/)).toBeInTheDocument()
  })

  it('dời cột một chút, vẫn sát hình: lưu được', () => {
    const onSave = open(pole('POLE-0002', 106.801), ROAD)

    setLat('10.80005')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    save()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].location.lat).toBeCloseTo(10.80005, 6)
  })

  it('cột vốn đã nằm xa mà không dời: chỉ cảnh báo, vẫn lưu được các thông tin khác', () => {
    const onSave = open(pole('POLE-0002', 106.801, 10.8005), ROAD)

    expect(screen.getByRole('alert')).toHaveTextContent(/quá 25 m/)
    save()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('tuyến hình thật: truyền previewKind="link", originCoord và giữ nguyên tuyến xanh khi dời cột', () => {
    mapPropsHolder.current = null
    open(pole('POLE-0002', 106.801, 10.8), ROAD)

    const savedBefore = getLatestMapProps()?.savedSegmentCoords
    expect(savedBefore?.length).toBeGreaterThanOrEqual(2)

    setLat('10.80005')
    const propsAfter = getLatestMapProps()
    expect(propsAfter?.previewKind).toBe('link')
    expect(propsAfter?.originCoord).toEqual([106.801, 10.8])
    expect(propsAfter?.savedSegmentCoords).toEqual(savedBefore)
  })
})

describe('Sửa cột trên tuyến chỉ có bản nháp nối cột', () => {
  it('dời cột trong 25 m quanh hình đang lưu: không cảnh báo, lưu được (đường chạy theo cột)', () => {
    const onSave = open(pole('POLE-0002', 106.801), JOINED)

    setLat('10.8001')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    save()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('dời cột quá 25 m so với hình đang lưu: chặn như backend sẽ chặn ở /location', () => {
    const onSave = open(pole('POLE-0002', 106.801), JOINED)

    setLat('10.8005')
    save()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/cách hình tuyến đang lưu \d+ m, quá 25 m/)).toBeInTheDocument()
  })

  it('truyền tuyến lưu đứng yên (savedSegmentCoords), tuyến xem trước (segmentCoords), corridorLine và originCoord xuống EditPoleMap', () => {
    mapPropsHolder.current = null
    open(pole('POLE-0002', 106.801), JOINED)

    const propsBefore = getLatestMapProps()
    expect(propsBefore).not.toBeNull()
    expect(propsBefore?.corridorMeters).toBe(ROUTE_CORRIDOR_M)
    expect(propsBefore?.originCoord).toEqual([106.801, 10.8])
    expect(propsBefore?.corridorLine?.length).toBeGreaterThanOrEqual(2)
    const savedBefore = propsBefore?.savedSegmentCoords

    // Dời cột lên phía bắc ~11 m: tuyến lưu đứng yên, tuyến xem trước đổi theo vị trí mới
    setLat('10.8001')
    const propsAfter = getLatestMapProps()
    expect(propsAfter?.previewKind).toBe('route')
    expect(propsAfter?.savedSegmentCoords).toEqual(savedBefore)
    expect(propsAfter?.segmentCoords).not.toEqual(savedBefore)
  })
})

describe('clampToCorridor - giới hạn kéo cột 25 m quanh tuyến', () => {
  const line: [number, number][] = [
    [106.8, 10.8],
    [106.802, 10.8],
  ]

  it('điểm nằm trong 25 m: giữ nguyên không kẹp', () => {
    const inside: [number, number] = [106.801, 10.8001] // ~11 m về phía bắc
    const res = clampToCorridor(inside, line, ROUTE_CORRIDOR_M)
    expect(res.clamped).toBe(false)
    expect(res.point).toEqual(inside)
  })

  it('điểm vượt quá 25 m: kẹp đúng mép 25 m theo tia từ hình chiếu tới con trỏ', () => {
    const outside: [number, number] = [106.801, 10.8005] // ~55.6 m về phía bắc
    const res = clampToCorridor(outside, line, ROUTE_CORRIDOR_M)
    expect(res.clamped).toBe(true)
    expect(res.distMeters).toBeGreaterThan(ROUTE_CORRIDOR_M)

    const distAfter = snapPointToPolyline(res.point, line).distMeters
    expect(distAfter).toBeLessThanOrEqual(ROUTE_CORRIDOR_M)
    expect(distAfter).toBeCloseTo(ROUTE_CORRIDOR_M, 0)
    // Giữ đúng hướng bắc (kinh độ gần như không đổi, vĩ độ lớn hơn tuyến)
    expect(res.point[0]).toBeCloseTo(106.801, 5)
    expect(res.point[1]).toBeGreaterThan(10.8)
    expect(calculateDistanceMeters([106.801, 10.8], res.point)).toBeCloseTo(ROUTE_CORRIDOR_M, 0)
  })

  it('tuyến rỗng hoặc < 2 điểm: không giới hạn', () => {
    const p: [number, number] = [106.801, 10.805]
    expect(clampToCorridor(p, [], ROUTE_CORRIDOR_M)).toEqual({
      point: p,
      clamped: false,
      distMeters: 0,
    })
    expect(clampToCorridor(p, [[106.8, 10.8]], ROUTE_CORRIDOR_M)).toEqual({
      point: p,
      clamped: false,
      distMeters: 0,
    })
  })
})

describe('diffRouteLines - tách đoạn sẽ bỏ và đoạn sẽ thêm', () => {
  const A: [number, number] = [106.8, 10.8]
  const B: [number, number] = [106.801, 10.8]
  const C: [number, number] = [106.802, 10.8]
  const D: [number, number] = [106.803, 10.8]
  const E: [number, number] = [106.804, 10.8]

  it('hai dãy giống nhau: không có đoạn bỏ hay đoạn thêm', () => {
    expect(diffRouteLines([A, B, C], [A, B, C])).toEqual({
      removed: [],
      added: [],
    })
  })

  it('thêm 1 đỉnh ở cuối tuyến: không có đoạn bỏ, đoạn thêm nối từ đỉnh cuối cũ tới đỉnh mới', () => {
    expect(diffRouteLines([A, B], [A, B, C])).toEqual({
      removed: [],
      added: [[B, C]],
    })
  })

  it('đổi 1 đỉnh ở giữa tuyến: chỉ tách đoạn kề đỉnh đổi, kèm đỉnh biên để nối liền tuyến xanh', () => {
    const C2: [number, number] = [106.802, 10.80015]
    expect(diffRouteLines([A, B, C, D, E], [A, B, C2, D, E])).toEqual({
      removed: [[B, C, D]],
      added: [[B, C2, D]],
    })
  })

  it('preview chèn thêm 1 đỉnh nằm giữa đoạn thẳng của saved: rỗng cả hai', () => {
    const midAB: [number, number] = [106.8005, 10.8]
    expect(diffRouteLines([A, B, C], [A, midAB, B, C])).toEqual({
      removed: [],
      added: [],
    })
  })

  it('preview đảo thứ tự đỉnh giữa nhưng đi qua cùng các cạnh: không có đoạn nào vừa ở removed vừa ở added', () => {
    const saved: [number, number][] = [A, B, C, D, E]
    const reversed: [number, number][] = [E, D, C, B, A]
    expect(diffRouteLines(saved, reversed)).toEqual({
      removed: [],
      added: [],
    })

    // Trường hợp chỉ 1 phần cạnh trùng (ví dụ A->B->C->D và A->C->B->D cùng có cạnh B-C)
    const savedPartial: [number, number][] = [A, B, C, D]
    const reordered: [number, number][] = [A, C, B, D]
    const diff = diffRouteLines(savedPartial, reordered)
    // Mọi cạnh trong removed đều không được trùng hình học với bất kỳ polyline nào trong added
    for (const rLine of diff.removed) {
      for (let i = 0; i < rLine.length - 1; i++) {
        const p1 = rLine[i]
        const p2 = rLine[i + 1]
        const mid: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2]
        const overlapsAdded = diff.added.some(
          (aLine) =>
            snapPointToPolyline(p1, aLine).distMeters <= 1 &&
            snapPointToPolyline(p2, aLine).distMeters <= 1 &&
            snapPointToPolyline(mid, aLine).distMeters <= 1
        )
        expect(overlapsAdded).toBe(false)
      }
    }
  })

  it('kéo 1 đỉnh giữa ra xa 30 m: removed và added khác rỗng và không chứa các cạnh không đổi ở hai đầu', () => {
    const C30: [number, number] = [106.802, 10.80027] // ~30 m về phía bắc
    const diff = diffRouteLines([A, B, C, D, E], [A, B, C30, D, E])

    expect(diff.removed.length).toBeGreaterThan(0)
    expect(diff.added.length).toBeGreaterThan(0)
    expect(diff.removed).toEqual([[B, C, D]])
    expect(diff.added).toEqual([[B, C30, D]])
    // Hai đầu A-B và D-E không nằm trong removed hay added
    const allDiffVertices = [...diff.removed.flat(), ...diff.added.flat()]
    expect(allDiffVertices).not.toContainEqual(A)
    expect(allDiffVertices).not.toContainEqual(E)
  })
})

describe('spurLines - nhánh bỏ / nhánh thêm cho tuyến hình thật', () => {
  const roadLine: [number, number][] = [
    [106.8, 10.8],
    [106.802, 10.8],
  ]

  it('cột cũ lệch tuyến -> có cả nhánh bỏ (từ tuyến tới cột cũ) và nhánh thêm (từ tuyến tới chấm đích)', () => {
    const origin: [number, number] = [106.801, 10.80009] // ~10 m phía bắc tuyến
    const dot: [number, number] = [106.8012, 10.79991] // ~10 m phía nam tuyến
    const res = spurLines(origin, dot, roadLine)

    expect(res.removed).toEqual([[[106.801, 10.8], origin]])
    expect(res.added).toEqual([[[106.8012, 10.8], dot]])
  })

  it('cột cũ nằm sát tuyến (< 0.5 m) -> không có nhánh bỏ, vẫn có nhánh thêm', () => {
    const originOnLine: [number, number] = [106.801, 10.8]
    const dot: [number, number] = [106.801, 10.8001]
    const res = spurLines(originOnLine, dot, roadLine)

    expect(res.removed).toEqual([])
    expect(res.added).toEqual([[[106.801, 10.8], dot]])
  })

  it('tuyến rỗng (< 2 điểm) hoặc thiếu origin -> trả rỗng cả hai', () => {
    const dot: [number, number] = [106.801, 10.8001]
    expect(spurLines([106.801, 10.80005], dot, [])).toEqual({ removed: [], added: [] })
    expect(spurLines([106.801, 10.80005], dot, [[106.8, 10.8]])).toEqual({ removed: [], added: [] })
    expect(spurLines(undefined, dot, roadLine)).toEqual({ removed: [], added: [] })
  })
})
