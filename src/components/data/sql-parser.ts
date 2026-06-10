/**
 * Parser SQL très simplifié pour extraire les `INSERT INTO ... VALUES (...)`
 * d'un dump MySQL / PostgreSQL / SQLite. Suffisant pour les exports
 * classiques produits par phpMyAdmin / pg_dump / SQLiteStudio.
 *
 * Limitations volontaires (pour rester côté navigateur) :
 * - On ignore les `INSERT IGNORE`, `INSERT ... ON DUPLICATE KEY` (l'instruction
 *   est lue, le suffixe est rejeté).
 * - Pas de support des sous-requêtes ni des séquences PostgreSQL.
 * - Les types datetime sont renvoyés en string ISO, à charge des
 *   `importRow()` de chaque entité de re-parser.
 */

export interface SqlInsertBatch {
    /** Table SQL d'origine. */
    table: string;
    /** Colonnes telles que déclarées dans l'INSERT, dans l'ordre. */
    columns: string[];
    /** Lignes converties en objets clé->valeur. */
    rows: Record<string, any>[];
}

const STRING_NULL = /^null$/i;

function stripComments(input: string): string {
    return input
        .replace(/--.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseColumnList(raw: string): string[] {
    return raw
        .split(',')
        .map(s => s.trim().replace(/^[`"\[]|[`"\]]$/g, ''))
        .filter(Boolean);
}

function parseValuesTuple(raw: string): any[] {
    const result: any[] = [];
    let i = 0;
    const n = raw.length;
    while (i < n) {
        while (i < n && /\s|,/.test(raw[i])) i += 1;
        if (i >= n) break;

        const ch = raw[i];
        if (ch === "'" || ch === '"') {
            const quote = ch;
            let value = '';
            i += 1;
            while (i < n) {
                const c = raw[i];
                if (c === '\\' && i + 1 < n) {
                    const next = raw[i + 1];
                    if (next === 'n') value += '\n';
                    else if (next === 't') value += '\t';
                    else if (next === 'r') value += '\r';
                    else value += next;
                    i += 2;
                    continue;
                }
                if (c === quote && raw[i + 1] === quote) {
                    value += quote;
                    i += 2;
                    continue;
                }
                if (c === quote) {
                    i += 1;
                    break;
                }
                value += c;
                i += 1;
            }
            result.push(value);
            continue;
        }

        // littéral non quoté (nombre, null, true/false)
        let raw2 = '';
        while (i < n && raw[i] !== ',') {
            raw2 += raw[i];
            i += 1;
        }
        const trimmed = raw2.trim();
        if (!trimmed) continue;
        if (STRING_NULL.test(trimmed)) {
            result.push(null);
        } else if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
            result.push(Number(trimmed));
        } else if (/^(true|false)$/i.test(trimmed)) {
            result.push(trimmed.toLowerCase() === 'true');
        } else {
            // Garde-fou : on conserve la valeur brute (par ex. fonctions SQL)
            result.push(trimmed);
        }
    }
    return result;
}

function splitTuples(raw: string): string[] {
    // Découpe `(...), (...)` en respectant les chaînes entre quotes.
    const tuples: string[] = [];
    let depth = 0;
    let buffer = '';
    let inString: string | null = null;
    for (let i = 0; i < raw.length; i += 1) {
        const c = raw[i];
        if (inString) {
            buffer += c;
            if (c === '\\' && i + 1 < raw.length) {
                buffer += raw[i + 1];
                i += 1;
                continue;
            }
            if (c === inString) inString = null;
            continue;
        }
        if (c === "'" || c === '"') {
            inString = c;
            buffer += c;
            continue;
        }
        if (c === '(') {
            depth += 1;
            if (depth === 1) {
                buffer = '';
                continue;
            }
        }
        if (c === ')') {
            depth -= 1;
            if (depth === 0) {
                tuples.push(buffer);
                buffer = '';
                continue;
            }
        }
        if (depth >= 1) buffer += c;
    }
    return tuples;
}

const INSERT_RE = /INSERT\s+(?:IGNORE\s+)?INTO\s+[`"\[]?(\w+)[`"\]]?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;

export function parseSqlInserts(content: string): SqlInsertBatch[] {
    const cleaned = stripComments(content);
    const batches: SqlInsertBatch[] = [];
    let match: RegExpExecArray | null;
    while ((match = INSERT_RE.exec(cleaned)) !== null) {
        const table = match[1];
        const columns = parseColumnList(match[2]);
        const tuples = splitTuples(match[3]);
        const rows: Record<string, any>[] = [];
        for (const tuple of tuples) {
            const values = parseValuesTuple(tuple);
            if (values.length === 0) continue;
            const row: Record<string, any> = {};
            columns.forEach((col, idx) => { row[col] = values[idx]; });
            rows.push(row);
        }
        batches.push({ table, columns, rows });
    }
    return batches;
}
