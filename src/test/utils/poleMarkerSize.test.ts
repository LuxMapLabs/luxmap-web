import { describe, it, expect } from 'vitest'
import { createPoleMarkerElement } from '../../utils/gis-map/markerUtils'

const feature = (id: string) =>
  ({ type: 'Feature', properties: { pole_id: id }, geometry: { type: 'Point', coordinates: [106.5, 10.97] } }) as never

const wrapOf = (isSelected: boolean) =>
  createPoleMarkerElement({
    feature: feature('POLE-0001'),
    isSelected,
    isManagedBySelectedCabinet: false,
    isOtherCabinetSelected: false,
    onClick: () => {},
    onHover: () => {},
    onLeave: () => {},
  }).firstElementChild as HTMLElement

describe('Chấm cột trên Bản đồ GIS', () => {
  it('cột đang chọn nhỉnh hơn cột thường, không gấp đôi (CSS chỉ phóng thêm khi bản đồ phóng to)', () => {
    expect(wrapOf(false).style.width).toBe('17px')
    expect(wrapOf(true).style.width).toBe('20px')
    expect(wrapOf(true).classList.contains('is-selected')).toBe(true)
  })
})
