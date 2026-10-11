import { all, fork } from 'redux-saga/effects'
import authSaga from '../feature/auth/authSaga'
import assetSaga from '../feature/assets/assetSaga'
import adminUserSaga from '../feature/admin/adminUserSaga'
import mapSaga from '../feature/map/mapSaga'

export default function* rootSaga() {
    yield all([
        fork(authSaga),
        fork(assetSaga),
        fork(adminUserSaga),
        fork(mapSaga),
    ])
}