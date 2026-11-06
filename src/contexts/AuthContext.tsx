import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, getDocs, where } from 'firebase/firestore';
import { auth, db, fbSignOut, handleFirestoreError, OperationType } from '../lib/firebase';
import { AuthContextType, Organization, UserProfile, UserRole } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [userOrgs, setUserOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchUserData = useCallback(async (user: User) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      }

      let profileData: UserProfile;

      if (!userSnap.exists()) {
        // First-time registration or login: Determine role from backend
        let role: UserRole = 'org_admin';
        try {
          const resp = await fetch('/api/auth/verify-role', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              email: user.email,
              organizationName: user.displayName ? `${user.displayName}'s Brand` : 'Acme Brand'
            })
          });
          if (resp.ok) {
            const data = await resp.json();
            if (data?.data?.role) {
              role = data.data.role;
            }
          }
        } catch (e) {
          console.warn('Backend role verification fallback:', e);
        }

        // Generate clean Org ID
        const orgId = `org_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const orgName = user.displayName ? `${user.displayName}'s Brand` : 'Main Brand';
        const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'main-brand';
        const nowIso = new Date().toISOString();

        const newOrg: Organization = {
          id: orgId,
          name: orgName,
          slug: orgSlug,
          createdBy: user.uid,
          createdAt: nowIso,
          plan: 'professional'
        };

        // Create organization
        try {
          await setDoc(doc(db, 'organizations', orgId), newOrg);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}`);
        }

        // Create initial membership (first user becomes Organisation Admin)
        try {
          await setDoc(doc(db, 'organizations', orgId, 'memberships', user.uid), {
            id: user.uid,
            organizationId: orgId,
            userId: user.uid,
            userEmail: user.email || '',
            role: role,
            joinedAt: nowIso
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}/memberships/${user.uid}`);
        }

        profileData = {
          id: user.uid,
          email: user.email || '',
          displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Brand Lead'),
          photoURL: user.photoURL || undefined,
          organizationId: orgId,
          role: role,
          createdAt: nowIso
        };

        try {
          await setDoc(userRef, profileData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        setUserProfile(profileData);
        setCurrentOrg(newOrg);
        setUserOrgs([newOrg]);
      } else {
        profileData = userSnap.data() as UserProfile;
        setUserProfile(profileData);

        // Fetch user active organization
        if (profileData.organizationId) {
          try {
            const orgSnap = await getDoc(doc(db, 'organizations', profileData.organizationId));
            if (orgSnap.exists()) {
              const activeOrg = orgSnap.data() as Organization;
              setCurrentOrg(activeOrg);
              setUserOrgs([activeOrg]);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.GET, `organizations/${profileData.organizationId}`);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserProfile(null);
        setCurrentOrg(null);
        setUserOrgs([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchUserData]);

  const switchOrganization = async (orgId: string) => {
    if (!currentUser || !userProfile) return;
    try {
      const orgSnap = await getDoc(doc(db, 'organizations', orgId));
      if (!orgSnap.exists()) throw new Error('Organization not found');

      // Verify membership
      const memberSnap = await getDoc(doc(db, 'organizations', orgId, 'memberships', currentUser.uid));
      if (!memberSnap.exists() && userProfile.role !== 'super_admin') {
        throw new Error('Not a member of this organization');
      }

      const updatedProfile: UserProfile = {
        ...userProfile,
        organizationId: orgId,
        role: memberSnap.exists() ? (memberSnap.data().role as UserRole) : userProfile.role
      };

      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile);
      setUserProfile(updatedProfile);
      setCurrentOrg(orgSnap.data() as Organization);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const createOrganization = async (orgName: string): Promise<Organization> => {
    if (!currentUser || !userProfile) throw new Error('Authentication required');

    const orgId = `org_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const orgSlug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'new-org';
    const nowIso = new Date().toISOString();

    const newOrg: Organization = {
      id: orgId,
      name: orgName,
      slug: orgSlug,
      createdBy: currentUser.uid,
      createdAt: nowIso,
      plan: 'professional'
    };

    try {
      await setDoc(doc(db, 'organizations', orgId), newOrg);
      await setDoc(doc(db, 'organizations', orgId, 'memberships', currentUser.uid), {
        id: currentUser.uid,
        organizationId: orgId,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        role: 'org_admin',
        joinedAt: nowIso
      });

      const updatedProfile: UserProfile = {
        ...userProfile,
        organizationId: orgId,
        role: 'org_admin'
      };

      await setDoc(doc(db, 'users', currentUser.uid), updatedProfile);
      setUserProfile(updatedProfile);
      setCurrentOrg(newOrg);
      setUserOrgs(prev => [...prev, newOrg]);
      return newOrg;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `organizations/${orgId}`);
    }
  };

  const logout = async () => {
    await fbSignOut(auth);
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        currentOrg,
        userOrgs,
        loading,
        switchOrganization,
        createOrganization,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
