import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  googleId: string;
  email: string;
  displayName: string;
  avatar?: string | null;
  bio?: string | null;
  expertise?: string[];
  certifications?: string[];
  role: 'user' | 'website_admin';
  isActive: boolean;
  lastLogin?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;