import React from 'react'
import {
  configureStore,
  type Reducer,
  type ReducersMapObject,
  type UnknownAction,
} from '@reduxjs/toolkit'
import createSagaMiddleware, { type Saga } from 'redux-saga'
import { Provider } from 'react-redux'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'

export interface MakeSagaStoreOptions<R extends ReducersMapObject = ReducersMapObject> {
  role?: string
  reducers: R
  sagas: Saga[]
}

export type SagaStore<R extends ReducersMapObject = ReducersMapObject> = ReturnType<typeof makeSagaStore<R>>

/**
 * Tạo store thật (reducer + saga middleware) cho test component đi qua saga.
 * Mỗi lần gọi tạo store MỚI (không dùng store dùng chung giữa các test).
 */
export function makeSagaStore<R extends ReducersMapObject>(options: MakeSagaStoreOptions<R>) {
  const { role = 'system_admin', reducers, sagas } = options
  const sagaMiddleware = createSagaMiddleware()

  const authReducer: Reducer<{ user: { role: string } | null }, UnknownAction> = () => ({
    user: { role },
  })

  const store = configureStore({
    reducer: {
      auth: authReducer,
      ...reducers,
    } as unknown as { auth: Reducer<{ user: { role: string } | null }, UnknownAction> } & R,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        thunk: true,
        serializableCheck: false,
        immutableCheck: false,
      }).concat(sagaMiddleware),
  })

  sagas.forEach((saga) => {
    sagaMiddleware.run(saga)
  })

  return store
}

export interface RenderWithSagaStoreOptions<R extends ReducersMapObject = ReducersMapObject>
  extends Partial<MakeSagaStoreOptions<R>> {
  store?: SagaStore<R>
  renderOptions?: Omit<RenderOptions, 'wrapper'>
}

export function renderWithSagaStore<R extends ReducersMapObject = ReducersMapObject>(
  ui: React.ReactElement,
  options: RenderWithSagaStoreOptions<R>
): RenderResult & { store: SagaStore<R> } {
  const { renderOptions, store: customStore, ...storeOptions } = options
  const store =
    customStore ||
    makeSagaStore({
      role: storeOptions.role,
      reducers: (storeOptions.reducers || {}) as R,
      sagas: storeOptions.sagas || [],
    })

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  )

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions })

  return {
    store,
    ...renderResult,
  }
}
