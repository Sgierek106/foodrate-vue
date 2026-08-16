import { reactive } from "vue";
import { getMe, logout as apiLogout, type AuthUser } from "./api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export const auth = reactive<AuthState>({
  user: null,
  loading: true,
});

/** Check whether the browser has a valid session. Call once on app start. */
export async function loadAuth() {
  auth.loading = true;
  try {
    auth.user = await getMe();
  } catch {
    auth.user = null;
  } finally {
    auth.loading = false;
  }
}

export async function logout() {
  try {
    await apiLogout();
  } finally {
    auth.user = null;
  }
}
