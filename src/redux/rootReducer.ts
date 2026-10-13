import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '../feature/auth/authSlice'
import assetReducer from '../feature/assets/assetSlice'
import workScheduleReducer from '../feature/work-schedule/workScheduleSlice'
import adminUserReducer from '../feature/admin/adminUserSlice'
import mapReducer from '../feature/map/mapSlice'
import citizenReportReducer from '../feature/citizen-report/citizenReportSlice'
import qrCodeReducer from '../feature/qr-code/qrCodeSlice'

const rootReducer = combineReducers({
    auth: authReducer,
    assets: assetReducer,
    workSchedule: workScheduleReducer,
    adminUsers: adminUserReducer,
    map: mapReducer,
    citizenReport: citizenReportReducer,
    qrCode: qrCodeReducer,
})

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer