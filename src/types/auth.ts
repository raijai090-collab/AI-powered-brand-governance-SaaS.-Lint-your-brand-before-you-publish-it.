export type UserRole = 'super_admin' | 'org_admin' | 'reviewer' | 'creator';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy: string;
  createdAt: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  organizationId: string;
  role: UserRole;
  createdAt: string;
}

export interface Membership {
  id: string;
  organizationId: string;
  userId: string;
  userEmail: string;
  role: UserRole;
  joinedAt: string;
}

export interface AuthContextType {
  currentUser: import('firebase/auth').User | null;
  userProfile: UserProfile | null;
  currentOrg: Organization | null;
  userOrgs: Organization[];
  loading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  createOrganization: (orgName: string) => Promise<Organization>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}
