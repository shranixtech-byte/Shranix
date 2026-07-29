import { configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
// Module slices will be added in PRM-005 onwards
// Example: inventoryReducer from '@/features/inventory/store'
export const store = configureStore({
    reducer: {
        app: (state = {}) => state,
    },
    devTools: process.env.NODE_ENV !== 'production',
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
        serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        },
    }),
});
export const useAppDispatch = useDispatch;
export const useAppSelector = useSelector;
//# sourceMappingURL=index.js.map