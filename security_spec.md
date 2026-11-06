# BrandLint Security Specification & Invariants

## 1. Data Invariants
1. **Tenant Isolation**: Every organization-owned record must store `organizationId`. A user can never read, create, update, or delete records belonging to an organization where they lack valid membership.
2. **Organization Integrity**: An organization document can only be created by an authenticated user where `createdBy == request.auth.uid`. The `createdBy` and `createdAt` fields are immutable.
3. **No Client Role Elevation**: Users cannot write or modify their own `role` or `organizationId` directly in client writes without authorization. The first registered user of an organization is assigned `org_admin`.
4. **Author & Ownership Verification**: For user profile documents (`/users/{userId}`), the document ID must match `request.auth.uid`. Reads and writes are isolated strictly to the user or super admin.
5. **Path Variable Hardening**: Document IDs and organization IDs in paths must strictly conform to `^[a-zA-Z0-9_-]+$` with length <= 128 characters.
6. **Sub-Collection Master Gate**: Any read or write to `/organizations/{orgId}/constitutions/...`, `/organizations/{orgId}/analyses/...`, or `/organizations/{orgId}/memberships/...` requires valid membership in `/organizations/{orgId}`.
7. **Strict Key Enforcement**: All incoming writes must have all required fields and only allowed fields.
8. **PII Isolation**: User email and identity in `/users/{userId}` is strictly restricted to `request.auth.uid == userId`. Blanket queries on the users collection are disallowed.

---

## 2. The Dirty Dozen Payloads (Adversarial Tests)

1. **Spoofed User Registration (Unauthenticated)**: An unauthenticated actor attempting to create `/users/attacker123`.
2. **Cross-Tenant User Profile Hijack**: Authenticated user `user_A` attempting to write to `/users/user_B`.
3. **Self-Promoted Super Admin Role Injection**: User `user_A` setting their own role to `super_admin` in their user profile.
4. **Organization Impersonation on Create**: User `user_A` creating an organization with `createdBy: "victim_B"`.
5. **Unjoined Organization Data Extraction**: User `user_A` trying to read `/organizations/org_B/constitutions/rules1` where they are not a member.
6. **Malicious Giant Payload (Denial of Wallet)**: Injecting a 2MB string into `name` or `title` fields.
7. **ID Poisoning Attack**: Trying to create a document at path with invalid chars `../../escape`.
8. **Ghost Field Injection (Shadow Update)**: Updating an analysis record with an unapproved key `{ "isAdminBypass": true }`.
9. **Timestamp Tampering**: Client supplying a fabricated back-dated timestamp in `createdAt`.
10. **Immutable Field Overwrite**: An organization update attempting to mutate `createdBy` or `id`.
11. **Cross-Tenant Analysis Creation**: Member of `org_A` attempting to write an analysis into `/organizations/org_B/analyses/doc1`.
12. **Blanket Query Scraping**: Attempting an unscoped query `collection('users')` without `resource.data.id == request.auth.uid`.

---

## 3. Test Runner Outline (firestore.rules.test.ts)
All tests verify that the 12 adversarial vectors result in `PERMISSION_DENIED` and valid tenant members receive access.
