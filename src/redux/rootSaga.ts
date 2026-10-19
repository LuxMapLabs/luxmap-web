import { all, fork } from 'redux-saga/effects'
import authSaga from '../feature/auth/authSaga'
import assetSaga from '../feature/assets/assetSaga'
import adminUserSaga from '../feature/admin/adminUserSaga'
import mapSaga from '../feature/map/mapSaga'
import citizenReportSaga from '../feature/citizen-report/citizenReportSaga'
import { citizenReportsSaga } from '../feature/citizen-reports/citizenReportsSaga'
import qrCodeSaga from '../feature/qr-code/qrCodeSaga'
import workScheduleSaga from '../feature/work-schedule/workScheduleSaga'

export default function* rootSaga() {
    yield all([
        fork(authSaga),
        fork(assetSaga),
        fork(adminUserSaga),
        fork(mapSaga),
        fork(citizenReportSaga),
        fork(citizenReportsSaga),
        fork(qrCodeSaga),
        fork(workScheduleSaga),
    ])
}