import { all, fork } from 'redux-saga/effects'
import authSaga from '../feature/auth/authSaga'

export default function* rootSaga() {
    yield all([
        fork(authSaga),
    ])
}