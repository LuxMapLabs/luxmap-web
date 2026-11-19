import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import rootReducer from '../../redux/rootReducer'
import assetReducer, {
  importAssetRequest,
  openImportModal,
  closeImportModal,
  downloadTemplateRequest,
} from '../../feature/assets/assetSlice'
import {
  ImportAssetModal,
  groupRowErrors,
  groupBySheet,
  formatRowLocation,
} from '../../pages/assets/components/ImportAssetModal'
import {
  previewAssetWorkbook,
  type WorkbookPreview,
} from '../../utils/assets/workbookPreview'
import type { WorkbookImportResult } from '../../types/assets/import'

vi.mock('../../utils/assets/workbookPreview', () => ({
  previewAssetWorkbook: vi.fn(),
}))

if (typeof File.prototype.arrayBuffer !== 'function') {
  File.prototype.arrayBuffer = async function () {
    return new ArrayBuffer(0)
  }
}

describe('ImportWorkbookModal Component Test Suite', () => {
  const mockOnClose = vi.fn()
  const mockOnImportSuccess = vi.fn()

  const createTestStore = (preloadedAssetsState?: Record<string, unknown>) => {
    return configureStore({
      reducer: rootReducer,
      preloadedState: preloadedAssetsState
        ? {
            assets: {
              ...assetReducer(undefined, { type: '@@INIT' }),
              ...preloadedAssetsState,
            },
          }
        : undefined,
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(previewAssetWorkbook).mockResolvedValue({
      sheets: [
        { sheet: 'Tuyến đường', rows: 0 },
        { sheet: 'Tủ điện', rows: 0 },
        { sheet: 'Mạch điện', rows: 0 },
        { sheet: 'Cột điện', rows: 0 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 0,
      issues: [],
    })
  })

  it('chọn file .csv → hiện "Chỉ nhận tệp Excel .xlsx." và nút "Xác nhận nạp" disabled', () => {
    const store = createTestStore()
    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const csvFile = new File(['column1,column2\nval1,val2'], 'test.csv', { type: 'text/csv' })
    fireEvent.change(fileInput, { target: { files: [csvFile] } })

    expect(screen.getByText('Chỉ nhận tệp Excel .xlsx.')).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: /Xác nhận nạp/i })
    expect(submitBtn).toBeDisabled()
  })

  it('không có ô hay khối chọn "Nguồn dữ liệu" (không radiogroup, không combobox)', () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.queryByText(/Nguồn dữ liệu/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('chỉ có duy nhất một input[type=file] trong modal ở mọi trạng thái', async () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText(/Tệp chưa có dòng dữ liệu nào/i)
    expect(document.querySelectorAll('input[type="file"]')).toHaveLength(1)
  })

  it('chọn tệp → hiện "Đang kiểm tra tệp…", nút "Xác nhận nạp" disabled; sau khi resolve hiện bảng đếm và nút "Xác nhận nạp 3 dòng" bật; bấm → dispatch importAssetRequest', async () => {
    let resolvePreview!: (value: WorkbookPreview) => void
    const previewPromise = new Promise<WorkbookPreview>((res) => {
      resolvePreview = res
    })
    vi.mocked(previewAssetWorkbook).mockReturnValueOnce(previewPromise)

    const store = createTestStore()
    const dispatchSpy = vi.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    // Đang kiểm tra
    expect(screen.getByText('Đang kiểm tra tệp…')).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /Xác nhận nạp/i })
    expect(submitBtn).toBeDisabled()

    // Resolve preview thành công với 3 dòng
    const mockPreview: WorkbookPreview = {
      sheets: [
        { sheet: 'Tuyến đường', rows: 1 },
        { sheet: 'Tủ điện', rows: 2 },
        { sheet: 'Mạch điện', rows: 0 },
        { sheet: 'Cột điện', rows: 0 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 3,
      issues: [],
    }
    resolvePreview(mockPreview)

    // Đợi UI cập nhật trạng thái F
    await screen.findByText(/Tệp hợp lệ/i)
    expect(screen.getByText('Tổng')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận nạp 3 dòng' })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)
    expect(dispatchSpy).toHaveBeenCalledWith(importAssetRequest({ file: xlsxFile }))
  })

  it('preview có issues → hiện "2 lỗi ở 2 dòng.", không có nút nạp bật, có "Chọn tệp khác"; KHÔNG dispatch import', async () => {
    const mockPreview: WorkbookPreview = {
      sheets: [
        { sheet: 'Tuyến đường', rows: 2 },
        { sheet: 'Tủ điện', rows: 0 },
        { sheet: 'Mạch điện', rows: 0 },
        { sheet: 'Cột điện', rows: 0 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 2,
      issues: [
        { sheet: 'Tuyến đường', row: 2, column: 'external_ref', message: 'Mã tuyến trống' },
        { sheet: 'Tuyến đường', row: 3, column: 'road_class', message: 'Cấp đường không hợp lệ' },
      ],
    }
    vi.mocked(previewAssetWorkbook).mockResolvedValueOnce(mockPreview)

    const store = createTestStore()
    const dispatchSpy = vi.spyOn(store, 'dispatch')

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText(/2 lỗi ở 2 dòng\./i)
    expect(screen.getByText('Mã tuyến trống')).toBeInTheDocument()
    expect(screen.getByText('Cấp đường không hợp lệ')).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /Xác nhận nạp/i })).toBeNull()
    const chooseOtherBtn = screen.getByRole('button', { name: 'Chọn tệp khác' })
    expect(chooseOtherBtn).toBeInTheDocument()

    expect(dispatchSpy).not.toHaveBeenCalledWith(importAssetRequest({ file: xlsxFile }))
  })

  it('trạng thái D render table có 5 hàng sheet và lỗi nằm sau hàng sheet của nó', async () => {
    const mockPreview: WorkbookPreview = {
      sheets: [
        { sheet: 'Tuyến đường', rows: 2 },
        { sheet: 'Tủ điện', rows: 0 },
        { sheet: 'Mạch điện', rows: 0 },
        { sheet: 'Cột điện', rows: 1 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 3,
      issues: [
        { sheet: 'Cột điện', row: 2, column: 'external_ref', message: 'Mã cột để trống' },
      ],
    }
    vi.mocked(previewAssetWorkbook).mockResolvedValueOnce(mockPreview)

    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText(/1 lỗi ở 1 dòng\./i)

    const table = document.querySelector('table')
    expect(table).toBeInTheDocument()

    // 5 hàng sheet
    expect(screen.getByRole('rowheader', { name: 'Tuyến đường' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Tủ điện' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Mạch điện' })).toBeInTheDocument()
    const poleHeader = screen.getByRole('rowheader', { name: 'Cột điện' })
    expect(poleHeader).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Bóng đèn' })).toBeInTheDocument()

    // Lỗi nằm sau hàng sheet Cột điện
    const poleRow = poleHeader.closest('tr')
    const errorRow = poleRow?.nextElementSibling
    expect(errorRow).toHaveTextContent('Mã cột để trống')
  })

  it('trạng thái F có dòng "Tổng"', async () => {
    const mockPreview: WorkbookPreview = {
      sheets: [
        { sheet: 'Tuyến đường', rows: 1 },
        { sheet: 'Tủ điện', rows: 1 },
        { sheet: 'Mạch điện', rows: 1 },
        { sheet: 'Cột điện', rows: 0 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 3,
      issues: [],
    }
    vi.mocked(previewAssetWorkbook).mockResolvedValueOnce(mockPreview)

    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText(/Tệp hợp lệ/i)

    const totalHeader = screen.getByRole('rowheader', { name: 'Tổng' })
    expect(totalHeader).toBeInTheDocument()
    const totalRow = totalHeader.closest('tr')
    expect(totalRow).toHaveTextContent('3')
  })

  it('preview totalRows = 0 → "Tệp chưa có dòng dữ liệu nào", nút disabled', async () => {
    const mockPreview: WorkbookPreview = {
      sheets: [
        { sheet: 'Tuyến đường', rows: 0 },
        { sheet: 'Tủ điện', rows: 0 },
        { sheet: 'Mạch điện', rows: 0 },
        { sheet: 'Cột điện', rows: 0 },
        { sheet: 'Bóng đèn', rows: 0 },
      ],
      totalRows: 0,
      issues: [],
    }
    vi.mocked(previewAssetWorkbook).mockResolvedValueOnce(mockPreview)

    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'empty.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText(/Tệp chưa có dòng dữ liệu nào\./i)
    expect(
      screen.getByText(/Điền dữ liệu vào các sheet tài sản của tệp mẫu rồi chọn lại\./i)
    ).toBeInTheDocument()

    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nạp' })
    expect(submitBtn).toBeDisabled()
  })

  it('previewAssetWorkbook reject → hiện "Không đọc được tệp…", nút disabled', async () => {
    vi.mocked(previewAssetWorkbook).mockRejectedValueOnce(new Error('Corrupted zip'))

    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['corrupted-data'], 'broken.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    await screen.findByText('Không đọc được tệp. Mở bằng Excel, lưu lại dạng .xlsx rồi chọn lại.')
    const submitBtn = screen.getByRole('button', { name: 'Xác nhận nạp' })
    expect(submitBtn).toBeDisabled()
  })

  it('đã chọn tệp → header hiện tên tệp và nút "Đổi tệp", không có nút "Bỏ chọn tệp"', async () => {
    const store = createTestStore()

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const xlsxFile = new File(['fake-excel-data'], 'danh-sach-tai-san.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    expect(screen.getByText('danh-sach-tai-san.xlsx')).toBeInTheDocument()
    await screen.findByText(/Tệp chưa có dòng dữ liệu nào\./i)

    const changeBtn = screen.getByRole('button', { name: 'Đổi tệp' })
    expect(changeBtn).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bỏ chọn tệp' })).toBeNull()
  })

  it('state importResult.committed=false có 2 lỗi → hiện "Chưa lưu dữ liệu nào", message và vị trí dòng', () => {
    const failedResult: WorkbookImportResult = {
      committed: false,
      failed: 2,
      total_errors: 2,
      rows: [
        { sheet: 'Cột điện', row: 3, column: 'external_ref', message: 'Mã cột không được để trống' },
        { sheet: 'Bóng đèn', row: 7, column: 'lamp_watt', message: 'Công suất đèn phải lớn hơn 0' },
      ],
    }

    const store = createTestStore({ importResult: failedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText(/Chưa lưu dữ liệu nào/i)).toBeInTheDocument()
    expect(screen.getByText('Mã cột không được để trống')).toBeInTheDocument()
    expect(screen.getByText('Dòng 3')).toBeInTheDocument()
    expect(screen.getByText('Dòng 7')).toBeInTheDocument()
  })

  it('khi có 2 lỗi ở sheet Cột điện → bảng hiện hàng Cột điện có số lỗi 2 và lỗi nằm bên dưới', () => {
    const failedResult: WorkbookImportResult = {
      committed: false,
      failed: 2,
      total_errors: 2,
      rows: [
        { sheet: 'Cột điện', row: 3, column: 'external_ref', message: 'Mã cột không được để trống' },
        { sheet: 'Cột điện', row: 5, column: 'pole_external_ref', message: 'Mã cột trùng lặp' },
      ],
    }

    const store = createTestStore({ importResult: failedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const poleHeader = screen.getByRole('rowheader', { name: 'Cột điện' })
    expect(poleHeader).toBeInTheDocument()
    const poleRow = poleHeader.closest('tr')
    expect(poleRow).toHaveTextContent('2')

    const errorRow = poleRow?.nextElementSibling
    expect(errorRow).toHaveTextContent('Mã cột không được để trống')
    expect(errorRow).toHaveTextContent('Mã cột trùng lặp')
  })

  it('state importResult.committed=true → hiện "Đã lưu vào hệ thống" và số thêm mới của Cột điện', () => {
    const successResult: WorkbookImportResult = {
      committed: true,
      segments: { inserted: 2, updated: 0, unchanged: 1 },
      cabinets: { inserted: 3, updated: 1, unchanged: 0 },
      feeders: { inserted: 4, updated: 0, unchanged: 0 },
      poles: { inserted: 18, updated: 5, unchanged: 2 },
      fixtures: { inserted: 18, updated: 0, unchanged: 0 },
      failed: 0,
      total_errors: 0,
      rows: [],
      total_warnings: 0,
      warnings: [],
    }

    const store = createTestStore({ importResult: successResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText(/Đã lưu vào hệ thống/i)).toBeInTheDocument()

    const poleLabel = screen.getByRole('rowheader', { name: 'Cột điện' })
    expect(poleLabel).toBeInTheDocument()
    const poleRow = poleLabel.closest('tr')
    expect(poleRow).toBeInTheDocument()
    expect(poleRow).toHaveTextContent('18')
  })

  it('bấm nút "Tải tệp mẫu" dispatch downloadTemplateRequest; khi isDownloadingTemplate true thì nút disabled', () => {
    const store = createTestStore()
    const dispatchSpy = vi.spyOn(store, 'dispatch')

    const { rerender } = render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const downloadBtn = screen.getByRole('button', { name: /Tải tệp mẫu/i })
    expect(downloadBtn).toBeInTheDocument()
    expect(downloadBtn).not.toBeDisabled()

    fireEvent.click(downloadBtn)
    expect(dispatchSpy).toHaveBeenCalledWith(downloadTemplateRequest())

    // Khi isDownloadingTemplate = true
    const downloadingStore = createTestStore({ isDownloadingTemplate: true })
    rerender(
      <Provider store={downloadingStore}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const loadingBtn = screen.getByRole('button', { name: /Đang tạo tệp mẫu/i })
    expect(loadingBtn).toBeInTheDocument()
    expect(loadingBtn).toBeDisabled()
  })

  it('store khởi tạo với error → hiện thông báo lỗi; chọn file .xlsx mới → lỗi cũ của store biến mất', async () => {
    const store = createTestStore({ error: 'Upload a .xlsx workbook.' })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText('Upload a .xlsx workbook.')).toBeInTheDocument()

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()

    const xlsxFile = new File(['fake-excel-data'], 'assets.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(fileInput, { target: { files: [xlsxFile] } })

    expect(screen.queryByText('Upload a .xlsx workbook.')).toBeNull()
    await screen.findByText(/Tệp chưa có dòng dữ liệu nào\./i)
  })

  it('reducer: openImportModal → isImportModalOpen true; closeImportModal → false', () => {
    const initialState = assetReducer(undefined, { type: '@@INIT' })
    expect(initialState.isImportModalOpen).toBe(false)

    const openedState = assetReducer(initialState, openImportModal())
    expect(openedState.isImportModalOpen).toBe(true)

    const closedState = assetReducer(openedState, closeImportModal())
    expect(closedState.isImportModalOpen).toBe(false)
  })

  it('formatRowLocation: vị trí "Dòng 2, 3" khi 2 dòng cùng lỗi; dòng 1 → "Tiêu đề"; >12 dòng → "+N"', () => {
    expect(formatRowLocation([2, 3])).toBe('Dòng 2, 3')
    expect(formatRowLocation([1])).toBe('Tiêu đề')
    expect(formatRowLocation([])).toBe('Toàn tệp')
    expect(
      formatRowLocation([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    ).toBe('Dòng 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13 +2')
  })

  it('groupRowErrors: 3 lỗi cùng column+message ở dòng 4, 2, 4 và 1 lỗi khác → 2 nhóm, nhóm đầu rows = [2, 4]', () => {
    const items = [
      { sheet: 'Bóng đèn', row: 4, column: 'lamp_watt', message: 'Công suất không hợp lệ' },
      { sheet: 'Bóng đèn', row: 2, column: 'lamp_watt', message: 'Công suất không hợp lệ' },
      { sheet: 'Bóng đèn', row: 4, column: 'lamp_watt', message: 'Công suất không hợp lệ' },
      { sheet: 'Tủ điện', row: 5, column: 'cabinet_external_ref', message: 'Mã tủ không tồn tại' },
    ]

    const groups = groupRowErrors(items)
    expect(groups).toHaveLength(2)
    expect(groups[0]).toEqual({
      column: 'lamp_watt',
      message: 'Công suất không hợp lệ',
      rows: [2, 4],
    })
    expect(groups[1]).toEqual({
      column: 'cabinet_external_ref',
      message: 'Mã tủ không tồn tại',
      rows: [5],
    })
  })

  it('groupBySheet: lỗi ở 2 sheet + 1 lỗi sheet: null → 3 nhóm đúng thứ tự, nhóm null có sheet === ""', () => {
    const items = [
      { sheet: 'Tủ điện', row: 2, column: 'cabinet_name', message: 'Tên tủ trùng' },
      { sheet: null, row: 1, column: null, message: 'Tệp sai định dạng' },
      { sheet: 'Cột điện', row: 4, column: 'external_ref', message: 'Mã cột trống' },
    ]

    const grouped = groupBySheet(items)
    expect(grouped).toHaveLength(3)
    expect(grouped[0].sheet).toBe('Tủ điện')
    expect(grouped[0].count).toBe(1)
    expect(grouped[1].sheet).toBe('')
    expect(grouped[1].count).toBe(1)
    expect(grouped[2].sheet).toBe('Cột điện')
    expect(grouped[2].count).toBe(1)
  })

  it('committed=true, mọi count 0 → hiện "Tệp chưa có dòng dữ liệu nào" và có table 5 hàng với các số 0', () => {
    const emptyResult: WorkbookImportResult = {
      committed: true,
      segments: { inserted: 0, updated: 0, unchanged: 0 },
      cabinets: { inserted: 0, updated: 0, unchanged: 0 },
      feeders: { inserted: 0, updated: 0, unchanged: 0 },
      poles: { inserted: 0, updated: 0, unchanged: 0 },
      fixtures: { inserted: 0, updated: 0, unchanged: 0 },
      failed: 0,
      total_errors: 0,
      rows: [],
      total_warnings: 0,
      warnings: [],
    }

    const store = createTestStore({ importResult: emptyResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText(/Tệp chưa có dòng dữ liệu nào\./i)).toBeInTheDocument()
    expect(
      screen.getByText(/Điền dữ liệu vào các sheet tài sản của tệp mẫu rồi nạp lại\./i)
    ).toBeInTheDocument()
    expect(document.querySelector('table')).not.toBeNull()
  })

  it('committed=true, chỉ có unchanged > 0 → hiện "Không có thay đổi nào"', () => {
    const unchangedResult: WorkbookImportResult = {
      committed: true,
      segments: { inserted: 0, updated: 0, unchanged: 3 },
      cabinets: { inserted: 0, updated: 0, unchanged: 1 },
      feeders: { inserted: 0, updated: 0, unchanged: 0 },
      poles: { inserted: 0, updated: 0, unchanged: 0 },
      fixtures: { inserted: 0, updated: 0, unchanged: 0 },
      failed: 0,
      total_errors: 0,
      rows: [],
      total_warnings: 0,
      warnings: [],
    }

    const store = createTestStore({ importResult: unchangedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText(/Không có thay đổi nào\./i)).toBeInTheDocument()
    expect(
      screen.getByText(/Mọi tài sản trong tệp đã khớp với dữ liệu trên hệ thống\./i)
    ).toBeInTheDocument()
    expect(document.querySelector('table')).not.toBeNull()
    const statusText = screen.getByText(/Không có thay đổi nào\./i)
    const statusContainer = statusText.closest('p')
    expect(statusContainer?.className).not.toMatch(/emerald/)
  })

  it('BE trả rows có "Required, but the cell is empty." → hiện "Ô bắt buộc đang trống."; hai dòng cùng câu BE gộp thành "Dòng 2, 3"', () => {
    const failedResult: WorkbookImportResult = {
      committed: false,
      failed: 2,
      total_errors: 2,
      rows: [
        {
          sheet: 'Cột điện',
          row: 2,
          column: 'external_ref',
          message: 'Required, but the cell is empty.',
        },
        {
          sheet: 'Cột điện',
          row: 3,
          column: 'external_ref',
          message: 'Required, but the cell is empty.',
        },
      ],
    }

    const store = createTestStore({ importResult: failedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText('Ô bắt buộc đang trống.')).toBeInTheDocument()
    expect(screen.getByText('Dòng 2, 3')).toBeInTheDocument()
  })

  it('câu lạ từ BE → hiện nguyên văn', () => {
    const unknownMessage = 'Unknown error code 999 occurred on server.'
    const failedResult: WorkbookImportResult = {
      committed: false,
      failed: 1,
      total_errors: 1,
      rows: [
        {
          sheet: 'Tủ điện',
          row: 4,
          column: 'cabinet_name',
          message: unknownMessage,
        },
      ],
    }

    const store = createTestStore({ importResult: failedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByText(unknownMessage)).toBeInTheDocument()
  })

  it('committed=false → có nút "Chọn tệp khác"; bấm vào → quay lại màn chọn tệp', () => {
    const failedResult: WorkbookImportResult = {
      committed: false,
      failed: 1,
      total_errors: 1,
      rows: [{ sheet: 'Mạch điện', row: 2, column: 'feeder_ref', message: 'Mạch điện không tồn tại' }],
    }

    const store = createTestStore({ importResult: failedResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    const reselectBtn = screen.getByRole('button', { name: /Chọn tệp khác/i })
    expect(reselectBtn).toBeInTheDocument()

    fireEvent.click(reselectBtn)

    expect(
      screen.getByText(/Kéo thả tệp \.xlsx vào đây hoặc/i)
    ).toBeInTheDocument()
  })

  it('committed=true → nút "Xong" có, không có nút "Đóng"', () => {
    const successResult: WorkbookImportResult = {
      committed: true,
      segments: { inserted: 2, updated: 0, unchanged: 0 },
      failed: 0,
      total_errors: 0,
      rows: [],
    }

    const store = createTestStore({ importResult: successResult })

    render(
      <Provider store={store}>
        <ImportAssetModal
          isOpen={true}
          onClose={mockOnClose}
          onImportSuccess={mockOnImportSuccess}
        />
      </Provider>
    )

    expect(screen.getByRole('button', { name: 'Xong' })).toBeInTheDocument()
    expect(screen.queryByText('Đóng')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Xong' }))
    expect(mockOnImportSuccess).toHaveBeenCalledWith(2)
    expect(mockOnClose).toHaveBeenCalled()
  })
})
