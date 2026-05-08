// Base types for the application
export type AppStatus = 'active' | 'inactive';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}
