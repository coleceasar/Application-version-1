# Security Specification: F& E Encrypted Messenger (Firebase Firestore)

## 1. Data Invariants

1. **User Scoping & Isolation**: Every user resource under `/users/{userId}` belongs strictly to that authenticated user (`request.auth.uid == userId`). Cross-user reading or writing of private contacts, messages, calls, or settings is categorically prohibited.
2. **Immutable Identity**: `userId` inside documents must strictly match `request.auth.uid` and path variable `{userId}`. It cannot be altered during updates.
3. **Strict Type & Size Limits**:
   - String fields must enforce explicit `.size()` limits (names <= 100 chars, emails <= 256, message text <= 65536 chars).
   - Document ID path variables must satisfy `isValidId(id)` (alphanumeric, underscores, hyphens, <= 128 chars).
4. **Action-Based Updates**: Updating messages or contacts is restricted to authorized state transitions and allowed fields only (`affectedKeys().hasOnly(...)`).
5. **No Blanket Reads**: List queries must be scoped to the authenticated user's own collection path or match `userId == request.auth.uid`.
6. **Catch-All Default Deny**: The root database rule matches `/{document=**}` and denies all reads and writes by default.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Spoofed User Creation (Ghost Identity Attack)**:
   - Operation: `setDoc('/users/victim_uid', { uid: 'victim_uid', displayName: 'Hacker', email: 'hacker@bad.com' })` by user `attacker_uid`.
   - Expected: PERMISSION_DENIED (Violates `request.auth.uid == userId`).
2. **Contact Injection into Another User's Roster**:
   - Operation: `setDoc('/users/victim_uid/contacts/c1', { id: 'c1', name: 'Spy', userId: 'victim_uid' })` by user `attacker_uid`.
   - Expected: PERMISSION_DENIED (Violates parent user ownership).
3. **Message Forgery (Stealing Message Thread)**:
   - Operation: `setDoc('/users/victim_uid/messages/m1', { id: 'm1', chatId: 'c1', senderId: 'attacker', text: 'Spam', userId: 'victim_uid' })` by user `attacker_uid`.
   - Expected: PERMISSION_DENIED (Forbidden write outside own namespace).
4. **Denial of Wallet (Huge Payload Attack)**:
   - Operation: Writing a message with `text` of 2MB string.
   - Expected: PERMISSION_DENIED (Violates `text.size() <= 65536`).
5. **Path Traversal / ID Poisoning**:
   - Operation: Writing to `/users/{userId}/messages/../../admins/evil_doc` or non-alphanumeric ID `m!@#$%^&*()`.
   - Expected: PERMISSION_DENIED (Violates `isValidId()`).
6. **Shadow Update / Field Pollution**:
   - Operation: `updateDoc('/users/user1/settings/config', { isAdmin: true })`.
   - Expected: PERMISSION_DENIED (Field not allowed by `affectedKeys().hasOnly(...)`).
7. **Unauthenticated Read of Contacts List**:
   - Operation: `getDocs(collection('users/user1/contacts'))` without auth credentials.
   - Expected: PERMISSION_DENIED (`request.auth == null`).
8. **Eavesdropping Other Users' Calls**:
   - Operation: `getDoc('/users/victim_uid/calls/call_123')` by user `attacker_uid`.
   - Expected: PERMISSION_DENIED (`request.auth.uid != victim_uid`).
9. **Tampering with Immutable CreatedAt / UserId**:
   - Operation: Updating message to change `userId` or `senderId` to another user.
   - Expected: PERMISSION_DENIED (`incoming().userId == existing().userId`).
10. **Corrupted Message Status (State Hack)**:
    - Operation: Modifying message with invalid status string `status: 'hacked_status_length_exceeded_overflow...'`.
    - Expected: PERMISSION_DENIED (Violates `status.size() <= 20`).
11. **Negative Duration Call Exploitation**:
    - Operation: Inserting call log with `duration: -999999` or non-numeric duration.
    - Expected: PERMISSION_DENIED (`duration is number && duration >= 0`).
12. **Blanket Collection Scraping**:
    - Operation: Running query across root collection `/users` to scrape all users without filtering.
    - Expected: PERMISSION_DENIED (Only individual user profile `get` or own collection read allowed).
