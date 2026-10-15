import { all, fork } from 'redux-saga/effects'
import authSaga from '../feature/auth/authSaga'
import assetSaga from '../feature/assets/assetSaga'
import adminUserSaga from '../feature/admin/adminUserSaga'
import mapSaga from '../feature/map/mapSaga'
import citizenReportSaga from '../feature/citizen-report/citizenReportSaga'
import qrCodeSaga from '../feature/qr-code/qrCodeSaga'

export default function* rootSaga() {
    yield all([
        fork(authSaga),
        fork(assetSaga),
        fork(adminUserSaga),
        fork(mapSaga),
        fork(citizenReportSaga),
        fork(qrCodeSaga),
    ])
}