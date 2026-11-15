/**
 * Hành lang khảo sát quanh tuyến: backend chỉ nhận vị trí cột trong khoảng này tính từ hình tuyến của CHÍNH cột đó
 * (`SurveyProcessing:RouteCorridorM`, mặc định 25 m; ngoài thì 409 `POLE_OFF_SEGMENT`). Web chỉ dùng để báo trước khi lưu;
 * backend vẫn là nơi quyết định, và lỗi 409 trả kèm con số thật.
 */
export const ROUTE_CORRIDOR_M = 25
