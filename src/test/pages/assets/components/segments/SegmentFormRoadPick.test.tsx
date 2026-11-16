import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../../../../redux/rootReducer'
import { AddSegmentModal } from '../../../../../pages/assets/components/segments/components/AddSegmentModal'
import { EditSegmentModal } from '../../../../../pages/assets/components/segments/components/EditSegmentModal'
import { fetchSegmentDetailSuccess } from '../../../../../feature/assets/assetSlice'
import { calculateRouteLengthMeters, parseLineStringWkt } from '../../../../../utils/gis-map/routeUtils'
import type { PickablePole } from '../../../../../components/SegmentPolePickerMap'
import type { PoleListItem } from '../../../../../types/assets/poles'
import type { SegmentListItem } from '../../../../../types/assets/segments'

// Nét đường của bản đồ nền mà bản đồ giả trả về, và chỗ người dùng bấm kế tiếp
const fake = vi.hoisted(() => ({
  // Con đường nằm ngang, cách hàng cột ở vĩ độ 10.8 khoảng 10 m
  roads: [
    [
      [106.7995, 10.80009],
      [106.8025, 10.80009],
    ],
  ] as [number, number][][],
  click: [0, 0] as [number, number],
  // Chỗ thả khi kéo tay nắm
  drop: [0, 0] as [number, number],
}))

// Bản đồ MapLibre không chạy được trong jsdom: thay bằng nút chọn cột, nút "bấm đường" và ghi lại thứ được vẽ
vi.mock('../../../../../components/SegmentPolePickerMap', () => ({
  SegmentPolePickerMap: ({
    poles,
    onTogglePole,
    fixedLine,
    pickMode,
    onPickRoadPoint,
    suggestedIds,
    onEditLine,
    onInsertBend,
  }: {
    poles: PickablePole[]
    onTogglePole: (id: string) => void
    fixedLine?: [number, number][]
    pickMode?: boolean
    onPickRoadPoint?: (click: [number, number], roads: [number, number][][], zoom: number) => void
    suggestedIds?: ReadonlySet<string>
    onEditLine?: (line: [number, number][]) => void
    onInsertBend?: (coord: [number, number]) => void
  }) => (
    <div
      data-testid="picker-map"
      data-fixed-line={JSON.stringify(fixedLine ?? null)}
      data-pick-mode={String(!!pickMode)}
      data-suggested={JSON.stringify([...(suggestedIds ?? [])].sort())}
    >
      {poles.map((p) => (
        <button key={p.id} type="button" onClick={() => onTogglePole(p.id)}>
          chọn {p.id}
        </button>
      ))}
      <button type="button" onClick={() => onPickRoadPoint?.(fake.click, fake.roads, 16)}>
        bấm đường
      </button>
      {onEditLine && fixedLine && (
        <button type="button" onClick={() => onEditLine([fixedLine[0], fake.drop, ...fixedLine.slice(1)])}>
          kéo chấm giữa đầu tiên
        </button>
      )}
      {onInsertBend && (
        <button type="button" onClick={() => onInsertBend(fake.drop)}>
          kéo chấm giữa hai cột
        </button>
      )}
    </div>
  ),
}))

const pole = (id: string, lng: number, lat: number, segmentId: string | null): PoleListItem => ({
  pole_id: id,
  external_ref: id,
  segment_id: segmentId,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  near_sensitive_poi: false,
  location: { lat, lng },
  updated_at: '2026-11-15T00:00:00Z',
})

// Hai cột sát đường (~10 m) và một cột cách đường ~46 m
const NEAR_1 = pole('POLE-0001', 106.8, 10.8, null)
const NEAR_2 = pole('POLE-0004', 106.802, 10.8, null)
const FAR = pole('POLE-0003', 106.801, 10.8005, null)

const makeStore = (poles: PoleListItem[], segments: SegmentListItem[] = []) => {
  const init = rootReducer(undefined, { type: 'init' })
  return configureStore({
    reducer: rootReducer,
    preloadedState: { ...init, assets: { ...init.assets, poles, segments } },
  })
}

const bamDuong = (lng: number, lat: number) => {
  fake.click = [lng, lat]
  fireEvent.click(screen.getByRole('button', { name: 'bấm đường' }))
}

/** Lấy hình theo đường: bấm điểm đầu và điểm cuối trên con đường, rồi "Xong". */
const layHinh = () => {
  fireEvent.click(screen.getByRole('button', { name: /Lấy (lại )?hình theo đường trên bản đồ/ }))
  bamDuong(106.7998, 10.8001)
  bamDuong(106.8022, 10.8001)
  fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
}

const openAdd = (poles: PoleListItem[]) => {
  const onAdd = vi.fn()
  render(
    <Provider store={makeStore(poles)}>
      <AddSegmentModal isOpen onClose={vi.fn()} onAddSegment={onAdd} existingCount={3} />
    </Provider>
  )
  fireEvent.change(screen.getByPlaceholderText(/Tuyến D/), { target: { value: 'Tuyến mới' } })
  return onAdd
}

const create = () => fireEvent.click(screen.getByRole('button', { name: /Tạo tuyến đường/ }))

beforeEach(() => {
  fake.click = [0, 0]
})

describe('Thêm tuyến: lấy hình bằng cách bấm trên con đường, không vẽ tay', () => {
  it('bấm điểm đầu và điểm cuối: gửi hình theo con đường và chiều dài đo trên nó, không nối cột', () => {
    const onAdd = openAdd([NEAR_1, NEAR_2])
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0001' }))
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0004' }))
    layHinh()
    create()

    expect(onAdd).toHaveBeenCalledTimes(1)
    const [segment, poleIds] = onAdd.mock.calls[0]
    const line = parseLineStringWkt(segment.geom_wkt)
    // Hai đầu nằm trên con đường (vĩ độ 10.80009), không phải trên cột (10.8)
    expect(line[0]).toEqual([106.7998, 10.80009])
    expect(line[line.length - 1]).toEqual([106.8022, 10.80009])
    expect(segment.length_m).toBe(calculateRouteLengthMeters(line))
    expect(segment.length_m).toBeGreaterThan(250)
    expect(segment.has_geometry).toBe(true)
    expect(poleIds).toEqual(expect.arrayContaining(['POLE-0001', 'POLE-0004']))
  })

  it('đang lấy hình: bản đồ ở chế độ bấm đường; bấm "Xong" thì thôi', () => {
    openAdd([NEAR_1])
    fireEvent.click(screen.getByRole('button', { name: 'Lấy hình theo đường trên bản đồ' }))
    expect(screen.getByTestId('picker-map').dataset.pickMode).toBe('true')
    bamDuong(106.7998, 10.8001)
    bamDuong(106.8022, 10.8001)
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
    expect(screen.getByTestId('picker-map').dataset.pickMode).toBe('false')
    expect(JSON.parse(screen.getByTestId('picker-map').dataset.fixedLine as string)).toHaveLength(2)
  })

  it('có hình rồi: gợi ý cột chưa thuộc tuyến nằm trong 25 m; "Thêm cả" gán đúng các cột đó', () => {
    const onAdd = openAdd([NEAR_1, NEAR_2, FAR])
    layHinh()

    expect(JSON.parse(screen.getByTestId('picker-map').dataset.suggested as string)).toEqual([
      'POLE-0001',
      'POLE-0004',
    ])
    fireEvent.click(screen.getByRole('button', { name: 'Thêm cả 2 cột' }))
    expect(screen.queryByRole('button', { name: /Thêm cả/ })).not.toBeInTheDocument()
    create()

    const [, poleIds] = onAdd.mock.calls[0]
    expect([...poleIds].sort()).toEqual(['POLE-0001', 'POLE-0004'])
  })

  it('cột đã chọn nằm xa con đường quá 25 m: chặn lưu và nêu mã cột', () => {
    const onAdd = openAdd([NEAR_1, FAR])
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0003' }))
    layHinh()

    expect(screen.getByRole('alert')).toHaveTextContent(/1 cột nằm cách hình tuyến quá 25 m \(POLE-0003\)/)
    create()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('có hình theo đường thì thứ tự cột do đường quyết: không kéo thả, không "Sắp xếp tự động"', () => {
    openAdd([NEAR_1, NEAR_2])
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0004' }))
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0001' }))
    expect(screen.getByRole('button', { name: 'Sắp xếp tự động' })).toBeInTheDocument()
    layHinh()

    expect(screen.queryByRole('button', { name: 'Sắp xếp tự động' })).not.toBeInTheDocument()
    expect(document.querySelector('[title="Kéo để đổi vị trí"]')).toBeNull()
    // Xếp từ đầu tới cuối con đường (tây sang đông)
    const rows = screen.getByRole('list', { name: 'Danh sách cột của tuyến' }).querySelectorAll('[data-pole-id]')
    expect([...rows].map((r) => (r as HTMLElement).dataset.poleId)).toEqual(['POLE-0001', 'POLE-0004'])
  })

  it('đường không có trên bản đồ nền: báo lỗi; chọn cột thì máy tự nối thành hình nháp', () => {
    const onAdd = openAdd([NEAR_1, NEAR_2])
    fireEvent.click(screen.getByRole('button', { name: 'Lấy hình theo đường trên bản đồ' }))
    bamDuong(106.8, 10.81)
    expect(screen.getByRole('alert')).toHaveTextContent(/không nằm trên con đường nào/)
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ lấy hình' }))

    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0004' }))
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0001' }))
    create()

    const [segment] = onAdd.mock.calls[0]
    expect(parseLineStringWkt(segment.geom_wkt)).toHaveLength(2)
    expect(segment.geom_wkt).toContain('106.8 10.8')
    expect(segment.geom_wkt).toContain('106.802 10.8')
  })

  it('đường không có trên bản đồ nền: "Vẽ tay" bấm từng điểm, gửi đúng các điểm đã bấm', () => {
    const onAdd = openAdd([])
    fireEvent.click(screen.getByRole('button', { name: 'Lấy hình theo đường trên bản đồ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vẽ tay' }))
    expect(screen.getByRole('button', { name: 'Vẽ tay' })).toHaveAttribute('aria-pressed', 'true')
    bamDuong(106.8, 10.81)
    bamDuong(106.801, 10.8105)
    bamDuong(106.802, 10.81)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
    create()

    const [segment] = onAdd.mock.calls[0]
    expect(parseLineStringWkt(segment.geom_wkt)).toEqual([
      [106.8, 10.81],
      [106.801, 10.8105],
      [106.802, 10.81],
    ])
    expect(segment.length_m).toBe(calculateRouteLengthMeters(parseLineStringWkt(segment.geom_wkt)))
  })

  it('lần lấy hình mới bắt đầu lại ở "Theo đường bản đồ"', () => {
    openAdd([])
    fireEvent.click(screen.getByRole('button', { name: 'Lấy hình theo đường trên bản đồ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Vẽ tay' }))
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ lấy hình' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lấy hình theo đường trên bản đồ' }))
    expect(screen.getByRole('button', { name: 'Theo đường bản đồ' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('không còn cột nào chưa thuộc tuyến: vẫn có bản đồ để lấy hình', () => {
    const onAdd = openAdd([])
    layHinh()
    create()
    expect(onAdd.mock.calls[0][0].has_geometry).toBe(true)
    expect(onAdd.mock.calls[0][1]).toEqual([])
  })
})

const segment: SegmentListItem = {
  segment_id: 'SEG-009',
  external_ref: 'SEG-009',
  segment_name: 'Tuyến nháp',
  road_class: 'inter_village',
  length_m: 50,
  commune_id: 'COM-001',
  commune_name: 'Phước Thiện',
  data_source: 'field',
  pole_count: 2,
  has_geometry: true,
  updated_at: '2026-11-15T00:00:00Z',
}

const openEdit = (poles: PoleListItem[], geomWkt: string) => {
  const store = makeStore(poles, [segment])
  const onSave = vi.fn()
  render(
    <Provider store={store}>
      <EditSegmentModal isOpen segment={segment} onClose={vi.fn()} onSave={onSave} />
    </Provider>
  )
  act(() => {
    store.dispatch(fetchSegmentDetailSuccess({ segmentId: 'SEG-009', geomWkt }))
  })
  return onSave
}

const save = () => fireEvent.click(screen.getByRole('button', { name: /Lưu Thay Đổi/i }))

describe('Sửa tuyến: lấy (lại) hình theo đường ngay trong form', () => {
  const own1 = pole('POLE-0001', 106.8, 10.8, 'SEG-009')
  const own2 = pole('POLE-0004', 106.802, 10.8, 'SEG-009')

  it('tuyến nháp nối cột: lấy hình theo đường thì gửi hình mới thay cho đường nối cột', () => {
    const onSave = openEdit([own1, own2], 'LINESTRING(106.8 10.8, 106.802 10.8)')
    layHinh()
    save()

    expect(onSave).toHaveBeenCalledTimes(1)
    const [updated] = onSave.mock.calls[0]
    expect(parseLineStringWkt(updated.geom_wkt)[0]).toEqual([106.7998, 10.80009])
    expect(updated.length_m).toBe(calculateRouteLengthMeters(parseLineStringWkt(updated.geom_wkt)))
  })

  it('hình mới: cột cũ của tuyến nằm xa cũng chặn lưu (cả tuyến phải nằm trong 25 m)', () => {
    const ownFar = pole('POLE-0003', 106.801, 10.8005, 'SEG-009')
    const onSave = openEdit([own1, ownFar], 'LINESTRING(106.8 10.8, 106.801 10.8005)')
    layHinh()

    expect(screen.getByRole('alert')).toHaveTextContent(/POLE-0003/)
    save()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('tuyến có hình theo đường: "Lấy lại hình" thay hình đang lưu', () => {
    const stored = 'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
    const onSave = openEdit([own1, own2], stored)
    expect(screen.getByText(/Tuyến đã có hình theo con đường/)).toBeInTheDocument()
    layHinh()
    expect(screen.queryByText(/Tuyến đã có hình theo con đường/)).not.toBeInTheDocument()
    save()

    const [updated] = onSave.mock.calls[0]
    expect(updated.geom_wkt).not.toBe(stored)
    expect(parseLineStringWkt(updated.geom_wkt)[0]).toEqual([106.7998, 10.80009])
  })

  it('huỷ lấy hình giữa chừng: hình đang lưu giữ nguyên', () => {
    const stored = 'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'
    const onSave = openEdit([own1, own2], stored)
    fireEvent.click(screen.getByRole('button', { name: 'Lấy lại hình theo đường trên bản đồ' }))
    bamDuong(106.7998, 10.8001)
    bamDuong(106.8022, 10.8001)
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ lấy hình' }))
    save()

    expect(onSave.mock.calls[0][0].geom_wkt).toBe(stored)
  })
})

describe('Uốn hình bằng kéo thả', () => {
  const own1 = pole('POLE-0001', 106.8, 10.8, 'SEG-009')
  const own2 = pole('POLE-0004', 106.802, 10.8, 'SEG-009')
  const stored = 'LINESTRING(106.7995 10.80009, 106.8005 10.80009, 106.8015 10.80009, 106.8025 10.80009)'

  it('Thêm tuyến: kéo chấm giữa trên hình đã lấy thì gửi hình có chỗ uốn mới', () => {
    const onAdd = openAdd([NEAR_1])
    layHinh()
    fake.drop = [106.801, 10.8002]
    fireEvent.click(screen.getByRole('button', { name: 'kéo chấm giữa đầu tiên' }))
    create()

    const line = parseLineStringWkt(onAdd.mock.calls[0][0].geom_wkt)
    expect(line).toHaveLength(3)
    expect(line[1]).toEqual([106.801, 10.8002])
    expect(onAdd.mock.calls[0][0].length_m).toBe(calculateRouteLengthMeters(line))
  })

  it('"Xong" lược bớt đỉnh: đường thẳng nhiều đỉnh còn hai đầu, để tay nắm không dày đặc', () => {
    fake.roads = [
      Array.from({ length: 31 }, (_, i) => [106.7995 + i * 0.0001, 10.80009] as [number, number]),
    ]
    try {
      openAdd([NEAR_1])
      layHinh()
      expect(JSON.parse(screen.getByTestId('picker-map').dataset.fixedLine as string)).toHaveLength(2)
    } finally {
      fake.roads = [
        [
          [106.7995, 10.80009],
          [106.8025, 10.80009],
        ],
      ]
    }
  })

  it('Sửa tuyến: kéo hình đang lưu thì gửi hình mới; kéo xa làm cột ngoài 25 m thì chặn', () => {
    const onSave = openEdit([own1, own2], stored)
    // Kéo lệch ~33 m về phía bắc: POLE-0001 (ở 10.8) cách cạnh mới quá 25 m
    fake.drop = [106.8, 10.8004]
    fireEvent.click(screen.getByRole('button', { name: 'kéo chấm giữa đầu tiên' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/POLE-0001/)
    save()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('Sửa tuyến: kéo nhẹ hình đang lưu thì lưu được hình mới', () => {
    const onSave = openEdit([own1, own2], stored)
    fake.drop = [106.8, 10.8001]
    fireEvent.click(screen.getByRole('button', { name: 'kéo chấm giữa đầu tiên' }))
    save()

    const line = parseLineStringWkt(onSave.mock.calls[0][0].geom_wkt)
    expect(line).toHaveLength(5)
    expect(line[1]).toEqual([106.8, 10.8001])
  })

  it('đã kéo rồi bấm "Lấy lại hình" xong huỷ: trả về hình vừa kéo', () => {
    const onSave = openEdit([own1, own2], stored)
    fake.drop = [106.8, 10.8001]
    fireEvent.click(screen.getByRole('button', { name: 'kéo chấm giữa đầu tiên' }))
    fireEvent.click(screen.getByRole('button', { name: 'Lấy lại hình theo đường trên bản đồ' }))
    bamDuong(106.7998, 10.8001)
    fireEvent.click(screen.getByRole('button', { name: 'Huỷ lấy hình' }))
    save()

    expect(parseLineStringWkt(onSave.mock.calls[0][0].geom_wkt)[1]).toEqual([106.8, 10.8001])
  })

  it('Hình nháp nối cột: kéo chấm giữa hai cột thêm điểm uốn vào hình', () => {
    const onAdd = openAdd([NEAR_1, NEAR_2])
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0001' }))
    fireEvent.click(screen.getByRole('button', { name: 'chọn POLE-0004' }))
    fake.drop = [106.801, 10.8001]
    fireEvent.click(screen.getByRole('button', { name: 'kéo chấm giữa hai cột' }))
    create()

    expect(parseLineStringWkt(onAdd.mock.calls[0][0].geom_wkt)).toEqual([
      [106.8, 10.8],
      [106.801, 10.8001],
      [106.802, 10.8],
    ])
  })
})
