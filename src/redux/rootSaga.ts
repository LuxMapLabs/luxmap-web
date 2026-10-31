import { all, fork } from 'redux-saga/effects'
import authSaga from '../feature/auth/authSaga'
import assetSaga from '../feature/assets/assetSaga'
import adminUserSaga from '../feature/users/userSaga'
import adminCommuneSaga from '../feature/communes/communeSaga'
import mapSaga from '../feature/map/mapSaga'
import citizenReportSaga from '../feature/citizen-report/citizenReportSaga'
import { citizenReportsSaga } from '../feature/citizen-reports/citizenReportsSaga'
import qrCodeSaga from '../feature/qr-code/qrCodeSaga'
import workScheduleSaga from '../feature/work-schedule/workScheduleSaga'
import dashboardSaga from '../feature/dashboard/dashboardSaga'
import settingsSaga from '../feature/settings/settingsSaga'
import adminSystemSaga from '../feature/adminSystem/adminSystemSaga'
import adminArtifactVersionSaga from '../feature/adminArtifactVersions/artifactVersionSaga'
import lightingSaga from '../feature/lighting/lightingSaga'

export default function* rootSaga() {
    yield all([
        fork(authSaga),
        fork(assetSaga),
        fork(adminUserSaga),
        fork(adminCommuneSaga),
        fork(mapSaga),
        fork(citizenReportSaga),
        fork(citizenReportsSaga),
        fork(qrCodeSaga),
        fork(workScheduleSaga),
        fork(dashboardSaga),
        fork(settingsSaga),
        fork(adminSystemSaga),
        fork(adminArtifactVersionSaga),
        fork(lightingSaga),
    ])
}
