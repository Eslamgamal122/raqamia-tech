export interface DatabaseResult { success: boolean; results: any[]; meta: { changes: number; last_row_id: number }; }
export interface PreparedStatement {
 bind(...args: any[]): PreparedStatement;
 all(): Promise<DatabaseResult>;
 first(column?: string): Promise<any>;
 run(): Promise<DatabaseResult>;
}
export function nodeDatabase(): { prepare(sql: string): PreparedStatement; batch(statements: PreparedStatement[]): Promise<DatabaseResult[]> };
export function rawDatabase(): import('node:sqlite').DatabaseSync;
export function migrate(connection: import('node:sqlite').DatabaseSync): void;
export function databasePath(): string;
export function dataDirectory(): string;
