import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "~/api/apiClient";

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (user, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/login", user);
      console.log("response", response?.data);
      return response?.data; // Trả về toàn bộ response để sử dụng message
    } catch (error) {
      console.error("Login error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Login failed" }
      );
    }
  }
);

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (user, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/register", user);
      return response?.data;
    } catch (error) {
      console.error("Register error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Registration failed" }
      );
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logoutUser",
  async (_, { rejectWithValue }) => {
    try {
      // Call API để đăng xuất nếu cần
      // await apiClient.post("/auth/logout");
      return { message: "Logout successfully" }; // Giả sử API trả về thông báo
    } catch (error) {
      console.error("Logout error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Logout failed" }
      );
    }
  }
);

export const forgotPassword = createAsyncThunk(
  "auth/forgotPassword",
  async ({ email, username }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post("/auth/forgot-password", {
        email,
        username,
      });
      return response?.data;
    } catch (error) {
      console.error("Forgot password error:", error);
      return rejectWithValue(
        error.response?.data || { message: "Forgot password failed" }
      );
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    login: {
      currentUser: {
        id: null,
        username: null,
        name: null,
        avatar: null,
      },
      token: null,
      error: null,
      loading: false,
      message: null, // Thêm trường message để lưu thông báo từ API
    },
    logout: {
      error: null,
      loading: false,
      message: null, // Thêm trường message
    },
    register: {
      error: null,
      loading: false,
      message: null, // Thêm trường message
    },
    forgotPassword: {
      error: null,
      loading: false,
      message: null, // Thêm trường message
    },
  },
  reducers: {
    clearError: (state) => {
      state.login.error = null;
      state.login.message = null;
      state.register.error = null;
      state.register.message = null;
      state.logout.error = null;
      state.logout.message = null;
      state.forgotPassword.error = null;
      state.forgotPassword.message = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Xử lý Login
      .addCase(loginUser.pending, (state) => {
        state.login.loading = true;
        state.login.error = null;
        state.login.message = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.login.loading = false;

        state.login.token = action.payload?.data?.token;

        // Lưu token vào localStorage
        localStorage.setItem("token", action.payload?.data?.token);

        state.login.currentUser = action.payload?.data?.user;
        state.login.error = null;
        state.login.message = action.payload?.message; // Hiển thị thông báo từ server
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.login.loading = false;
        state.login.error = action.payload?.message || "Login failed";
        state.login.message = action.payload?.message; // Hiển thị thông báo lỗi
      })

      // Xử lý Logout
      .addCase(logoutUser.pending, (state) => {
        state.logout.loading = true;
        state.logout.error = null;
        state.logout.message = null;
      })
      .addCase(logoutUser.fulfilled, (state, action) => {
        state.logout.loading = false;

        // Xóa thông tin người dùng và token
        state.login.currentUser = null;
        state.login.token = null;

        // Xóa token khỏi localStorage
        localStorage.removeItem("token");

        state.logout.error = null;
        state.logout.message = action.payload?.message; // Hiển thị thông báo từ server
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.logout.loading = false;
        state.logout.error = action.payload?.message || "Logout failed";
        state.logout.message = action.payload?.message; // Hiển thị thông báo lỗi
      })

      // Xử lý Register
      .addCase(registerUser.pending, (state) => {
        state.register.loading = true;
        state.register.error = null;
        state.register.message = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.register.loading = false;
        state.register.error = null;
        state.register.message = action.payload?.message; // Hiển thị thông báo từ server
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.register.loading = false;
        state.register.error = action.payload?.message || "Registration failed";
        state.register.message = action.payload?.message; // Hiển thị thông báo lỗi
      })
      // Xử lý Forgot password
      .addCase(forgotPassword.pending, (state) => {
        state.forgotPassword.loading = true;
        state.forgotPassword.error = null;
        state.forgotPassword.message = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.forgotPassword.loading = false;
        state.forgotPassword.error = null;
        state.forgotPassword.message = action.payload?.message; // Hiển thị thông báo từ server
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.forgotPassword.loading = false;
        state.forgotPassword.error =
          action.payload?.message || "Forgot password failed";
        state.forgotPassword.message = action.payload?.message; // Hiển thị thông báo lỗi
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer;
