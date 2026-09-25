/**
 * Faux Firestore en mémoire pour tester la LOGIQUE MÉTIER des services
 * (class-assignment-service.ts, academic-year-service.ts) sans emulator, sans
 * réseau, sans authentification — les règles de sécurité sont testées
 * séparément et réellement (tests/firestore-rules/, avec l'emulator).
 *
 * Ne couvre que le sous-ensemble de l'API `firebase/firestore` réellement
 * utilisé par ces services : collection/doc, query + where('==', ...),
 * get/set/update, writeBatch, serverTimestamp/increment/deleteField comme
 * "sentinelles" résolues au commit — pas un mock exhaustif du SDK.
 *
 * Usage dans un fichier de test :
 *
 *   vi.mock('firebase/firestore', () => import('../helpers/fake-firestore'));
 *   vi.mock('@/firebase/config', () => ({ firebaseFirestore: { __type: 'db' } }));
 *   import { __store } from '../helpers/fake-firestore';
 *   beforeEach(() => __store.reset());
 */

type DocData = Record<string, any>;

const INCREMENT = Symbol('increment');
const DELETE_FIELD = Symbol('deleteField');
const SERVER_TIMESTAMP = Symbol('serverTimestamp');

let docs = new Map<string, DocData>();
let autoIdCounter = 0;

function resolveValue(existing: any, incoming: any): any {
  if (incoming && incoming.__op === INCREMENT) {
    return (typeof existing === 'number' ? existing : 0) + incoming.amount;
  }
  if (incoming && incoming.__op === DELETE_FIELD) {
    return undefined; // supprimé après coup par applyMerge
  }
  if (incoming && incoming.__op === SERVER_TIMESTAMP) {
    return '2026-01-01T00:00:00.000Z'; // horodatage déterministe pour les assertions
  }
  return incoming;
}

function applyMerge(path: string, patch: DocData) {
  const existing = docs.get(path) ?? {};
  const next: DocData = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    const resolved = resolveValue(existing[key], value);
    if (resolved === undefined && value && (value as any).__op === DELETE_FIELD) {
      delete next[key];
    } else {
      next[key] = resolved;
    }
  }
  docs.set(path, next);
}

export const __store = {
  reset(seed?: Record<string, DocData>) {
    docs = new Map(Object.entries(seed ?? {}));
    autoIdCounter = 0;
  },
  get(path: string) {
    return docs.get(path);
  },
  set(path: string, data: DocData) {
    docs.set(path, { ...data });
  },
  dump() {
    return Object.fromEntries(docs.entries());
  },
};

// ---- refs ----

interface CollectionRef { __type: 'collection'; path: string }
interface DocRef { __type: 'doc'; path: string; id: string }

export function collection(_db: unknown, path: string): CollectionRef {
  return { __type: 'collection', path };
}

export function doc(first: CollectionRef | unknown, second?: string): DocRef {
  if (first && (first as CollectionRef).__type === 'collection') {
    const collectionRef = first as CollectionRef;
    const id = second ?? `auto${++autoIdCounter}`;
    return { __type: 'doc', path: `${collectionRef.path}/${id}`, id };
  }
  // doc(db, 'full/path/to/doc')
  const path = second as string;
  const segments = path.split('/');
  return { __type: 'doc', path, id: segments[segments.length - 1] };
}

// ---- query ----

interface WhereClause { field: string; op: string; value: any }
interface QueryRef { __type: 'query'; collectionPath: string; clauses: WhereClause[] }

export function where(field: string, op: string, value: any): WhereClause {
  return { field, op, value };
}

export function query(collectionRef: CollectionRef, ...clauses: WhereClause[]): QueryRef {
  return { __type: 'query', collectionPath: collectionRef.path, clauses };
}

function docsUnder(collectionPath: string): Array<{ path: string; id: string; data: DocData }> {
  const prefix = `${collectionPath}/`;
  const results: Array<{ path: string; id: string; data: DocData }> = [];
  for (const [path, data] of docs.entries()) {
    if (!path.startsWith(prefix)) continue;
    const rest = path.slice(prefix.length);
    if (rest.includes('/')) continue; // documents d'une sous-collection, pas de celle-ci
    results.push({ path, id: rest, data });
  }
  return results;
}

function matches(data: DocData, clauses: WhereClause[]): boolean {
  return clauses.every(c => {
    if (c.op !== '==') throw new Error(`fake-firestore: opérateur non supporté "${c.op}"`);
    return data[c.field] === c.value;
  });
}

function snapshotFromDocs(matched: Array<{ path: string; id: string; data: DocData }>) {
  return {
    empty: matched.length === 0,
    size: matched.length,
    docs: matched.map(m => ({
      id: m.id,
      ref: { __type: 'doc', path: m.path, id: m.id } as DocRef,
      data: () => ({ ...m.data }),
    })),
    forEach(cb: (d: any) => void) { this.docs.forEach(cb); },
  };
}

export async function getDocs(target: CollectionRef | QueryRef) {
  if (target.__type === 'collection') {
    return snapshotFromDocs(docsUnder(target.path));
  }
  const all = docsUnder(target.collectionPath);
  return snapshotFromDocs(all.filter(d => matches(d.data, target.clauses)));
}

export async function getDoc(ref: DocRef) {
  const data = docs.get(ref.path);
  return {
    exists: () => data !== undefined,
    data: () => (data ? { ...data } : undefined),
    id: ref.id,
    ref,
  };
}

export async function setDoc(ref: DocRef, data: DocData) {
  const clean: DocData = {};
  for (const [k, v] of Object.entries(data)) clean[k] = resolveValue(undefined, v);
  docs.set(ref.path, clean);
}

export async function updateDoc(ref: DocRef, patch: DocData) {
  if (!docs.has(ref.path)) throw new Error(`fake-firestore: updateDoc sur un document inexistant (${ref.path})`);
  applyMerge(ref.path, patch);
}

// ---- batch ----

type BatchOp =
  | { kind: 'set'; path: string; data: DocData; merge?: boolean }
  | { kind: 'update'; path: string; patch: DocData }
  | { kind: 'delete'; path: string };

export function writeBatch(_db: unknown) {
  const ops: BatchOp[] = [];
  return {
    set(ref: DocRef, data: DocData, options?: { merge?: boolean }) {
      ops.push({ kind: 'set', path: ref.path, data, merge: options?.merge });
    },
    update(ref: DocRef, patch: DocData) {
      ops.push({ kind: 'update', path: ref.path, patch });
    },
    delete(ref: DocRef) {
      ops.push({ kind: 'delete', path: ref.path });
    },
    async commit() {
      for (const op of ops) {
        if (op.kind === 'delete') {
          docs.delete(op.path);
        } else if (op.kind === 'set' && !op.merge) {
          const clean: DocData = {};
          for (const [k, v] of Object.entries(op.data)) clean[k] = resolveValue(undefined, v);
          docs.set(op.path, clean);
        } else {
          // 'update', ou 'set' avec merge: true — même sémantique de fusion ici.
          applyMerge(op.path, op.kind === 'set' ? op.data : op.patch);
        }
      }
    },
  };
}

// ---- sentinelles ----

export function increment(amount: number) {
  return { __op: INCREMENT, amount };
}

export function deleteField() {
  return { __op: DELETE_FIELD };
}

export function serverTimestamp() {
  return { __op: SERVER_TIMESTAMP };
}

// Types réexportés en `unknown` : uniquement utilisés comme annotations de
// type dans le code testé (effacées à l'exécution), jamais comme valeurs.
export type Firestore = unknown;
export type WriteBatch = ReturnType<typeof writeBatch>;
