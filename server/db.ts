import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from './config';

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[Database Pool Error]:', err.message);
});

/**
 * 统一参数化 SQL 查询封装
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[Slow Query] (${duration}ms): ${text}`);
    }
    return res;
  } catch (err: any) {
    console.error(`[Database Query Error]: ${err.message}\nQuery: ${text}\nParams:`, params);
    throw err;
  }
}

/**
 * 软删除封装：强制遵循规范 2（逻辑删除）
 */
export async function softDelete(
  tableName: string,
  id: string,
  updatedBy?: string
): Promise<boolean> {
  const sql = `
    UPDATE ${tableName}
    SET is_deleted = TRUE,
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by = $2
    WHERE id = $1 AND is_deleted = FALSE
  `;
  const res = await query(sql, [id, updatedBy || null]);
  return (res.rowCount ?? 0) > 0;
}
