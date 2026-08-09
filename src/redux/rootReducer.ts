import { combineReducers } from '@reduxjs/toolkit'

const rootReducer = combineReducers({
    // Placeholder reducer để tránh lỗi khi chưa có feature nào
    _placeholder: (state = null) => state,
})

export type RootState = ReturnType<typeof rootReducer>
export default rootReducer