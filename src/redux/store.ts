import { configureStore } from '@reduxjs/toolkit'
import createSagaMiddleware from 'redux-saga'
import rootReducer from './rootReducer'
import rootSaga from './rootSaga'

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            thunk: true,
            serializableCheck: false,
        }).concat(sagaMiddleware),
    devTools: {
        name: 'LuxMap Web Store',
    },
})

sagaMiddleware.run(rootSaga)

export type AppDispatch = typeof store.dispatch
export type { RootState } from './rootReducer'
export default store