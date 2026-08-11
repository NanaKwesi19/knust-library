export type UserRole = 'STUDENT' | 'STAFF' | 'LIBRARIAN' | 'ADMIN';

export interface AuthUser {
  id: number;
  userUuid?: string;
  fullName: string;
  role: UserRole;
  email: string;
  studentId?: string;
  programme?: string;
  department?: string;
  yearOfStudy?: number;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}