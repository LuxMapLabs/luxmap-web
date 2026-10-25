import { combineReducers } from '@reduxjs/toolkit'
import authReducer from '../feature/auth/authSlice'
import assetReducer from '../feature/assets/assetSlice'
import workScheduleReducer from '../feature/work-schedule/workScheduleSlice'
import adminUserReducer from '../feature/users/userSlice'
import adminCommuneReducer from '../feature/communes/communeSlice'
import mapReducer from '../feature/map/mapSlice'
import citizenReportReducer from '../feature/citizen-report/citizenReportSlice'
import citizenReportsReducer from '../feature/citizen-reports/citizenReportsSlice'
import qrCodeReducer from '../feature/qr-code/qrCodeSlice'
import dashboardReducer from '../feature/dashboard/dashboardSlice'

const rootReducer = combineReducers({
    auth: authReducer,
    assets: assetReducer,
    workSchedule: workScheduleReducer,
    adminUsers: adminUserReducer,
    adminCommunes: adminCommuneReducer,
    map: mapReducer,
    citizenReport: citizenReportReducer,
    citizenReports: citizenReportsReducer,
    qrCode: qrCodeReducer,
    dashboard: dashboardReducer,
})

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer
