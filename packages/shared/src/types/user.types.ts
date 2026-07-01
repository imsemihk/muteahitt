export type UserRole = 'LAND_OWNER' | 'CONTRACTOR' | 'ADMIN';
export type UserType = 'LAND_OWNER' | 'CONTRACTOR';
export type UserStatus = 'PENDING_EMAIL' | 'ACTIVE' | 'SUSPENDED' | 'BANNED';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}
