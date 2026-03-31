export const AUTH_CALLBACK_PATH = '/auth/callback'
export const RESET_PASSWORD_PATH = '/reset-password'
export const LOGIN_PATH = '/login'
export const SIGNUP_PATH = '/signup'
export const SIGNUP_ACCESS_MISSING_PATH = '/signup?access=missing'

export const SUPERADMIN_HOME_PATH = '/gnr8/command-center'
export const AGENCY_HOME_PATH = '/gnr8/agency'
export const CLIENT_HOME_PATH = '/gnr8/client'
export const OWNER_SETUP_PATH = '/gnr8/onboarding/owner-setup'

export const AUTH_ROLE_PRECEDENCE = ['superadmin', 'agency', 'client'] as const

/**
 * Canonical auth flow map (system reference)
 * - login (/login) -> resolve post-login -> role home
 * - invite (/auth/callback?type=invite|signup) -> callback next resolver -> onboarding/dashboard
 * - recovery (/reset-password via direct link OR /auth/callback?type=recovery hop) -> /login
 * - root (/) -> public entry links to /login and /signup
 * - unresolved auth -> fail-closed /signup?access=missing
 * - multi-role precedence -> superadmin > agency > client
 */
export const AUTH_FLOW_MODEL = {
  login_entry: LOGIN_PATH,
  post_login_resolution: '/api/auth/post-login-home',
  invite_callback_entry: AUTH_CALLBACK_PATH,
  invite_callback_resolution: '/api/auth/callback/next',
  owner_onboarding_entry: OWNER_SETUP_PATH,
  recovery_entry: RESET_PASSWORD_PATH,
  root_public_entry: '/',
  fail_closed_entry: SIGNUP_ACCESS_MISSING_PATH,
  multi_role_precedence: AUTH_ROLE_PRECEDENCE,
} as const

export type AuthCallbackType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email'

export function isInviteOrOnboardingCallbackType(type: AuthCallbackType | null): boolean {
  return type === 'invite' || type === 'signup'
}
