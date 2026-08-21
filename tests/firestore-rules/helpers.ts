import {
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const PROJECT_ID = 'gerecole-rules-test';

export async function setupEnv(): Promise<RulesTestEnvironment> {
  const rules = readFileSync(
    path.resolve(__dirname, '../../firestore.rules'),
    'utf8',
  );
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080,
    },
  });
}

/**
 * Seed fixtures bypassing rules. Expected shape:
 *   users/{uid}              → user profile
 *   ecoles/{schoolId}        → school doc (with directorId, etc.)
 *   ecoles/{schoolId}/personnel/{uid}
 *   ecoles/{schoolId}/admin_roles/{roleId}
 *   ecoles/{schoolId}/eleves/{studentId}
 */
export interface Seed {
  users?: Record<string, any>;
  schools?: Record<string, any>;
  personnel?: Record<string, Record<string, any>>; // schoolId -> uid -> data
  adminRoles?: Record<string, Record<string, any>>; // schoolId -> roleId -> data
  students?: Record<string, Record<string, any>>; // schoolId -> studentId -> data
}

export async function seed(env: RulesTestEnvironment, data: Seed) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as any;
    for (const [uid, value] of Object.entries(data.users ?? {})) {
      await setDoc(doc(db, `users/${uid}`), value);
    }
    for (const [schoolId, value] of Object.entries(data.schools ?? {})) {
      await setDoc(doc(db, `ecoles/${schoolId}`), value);
    }
    for (const [schoolId, members] of Object.entries(data.personnel ?? {})) {
      for (const [uid, value] of Object.entries(members)) {
        await setDoc(doc(db, `ecoles/${schoolId}/personnel/${uid}`), value);
      }
    }
    for (const [schoolId, roles] of Object.entries(data.adminRoles ?? {})) {
      for (const [roleId, value] of Object.entries(roles)) {
        await setDoc(doc(db, `ecoles/${schoolId}/admin_roles/${roleId}`), value);
      }
    }
    for (const [schoolId, students] of Object.entries(data.students ?? {})) {
      for (const [studentId, value] of Object.entries(students)) {
        await setDoc(doc(db, `ecoles/${schoolId}/eleves/${studentId}`), value);
      }
    }
  });
}
