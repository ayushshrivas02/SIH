import Database from 'better-sqlite3';
import { AIProviderManager } from './manager';

export async function executeSqlRagQuery(query: string, dbUri: string, dbName: string) {
  // Extract path from file:uri
  const dbPath = dbUri.replace('file:', '');
  
  // 1. Connect to the SQLite Database
  const db = new Database(dbPath, { readonly: true });
  
  try {
    // 2. Extract Schema
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as {name: string}[];
    
    let schemaStr = `Database Schema for ${dbName}:\n\n`;
    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all() as {name: string, type: string}[];
      schemaStr += `Table: ${table.name}\nColumns: ${columns.map(c => `${c.name} (${c.type})`).join(', ')}\n\n`;
    }

    // 3. Generate SQL Query using LLM
    const llm = await AIProviderManager.getProviderForTask('CHAT');
    
    const sqlGenerationPrompt = `You are a SQL expert querying a SQLite database. 
Given the following database schema, generate a single valid SQLite query to answer the user's question.
Return ONLY the raw SQL query string. Do not use markdown formatting, backticks, or any explanation.

${schemaStr}`;

    const sqlResponse = await llm.chat([
      { role: 'system', content: sqlGenerationPrompt },
      { role: 'user', content: query }
    ]);

    let generatedSql = sqlResponse.trim();
    // Clean up potential markdown formatting from over-enthusiastic LLMs
    generatedSql = generatedSql.replace(/^```sql/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    // 4. Execute the SQL Query securely
    let results: any[];
    try {
      results = db.prepare(generatedSql).all();
    } catch (sqlError: any) {
       // If the SQL is invalid, return the error early
       return {
         answer: `I generated a SQL query, but it failed to execute: ${sqlError.message}`,
         sources: [{
           chunkId: 'sql-error',
           documentName: dbName,
           pageNumber: 1,
           section: 'Generated SQL',
           content: generatedSql,
           score: 0
         }],
         grounded: false
       };
    }

    // 5. Generate human-readable answer from results
    const answerSynthesisPrompt = `You are an AI Data Analyst. 
The user asked a question, and a SQL query was executed to find the answer.
Given the user's question, the SQL query used, and the raw JSON results, write a concise, conversational answer.

User Question: ${query}
SQL Query: ${generatedSql}
Raw Results: ${JSON.stringify(results).substring(0, 2000)} /* Truncated for context limits */`;

    const finalAnswer = await llm.chat([
      { role: 'system', content: answerSynthesisPrompt }
    ]);

    return {
      answer: finalAnswer,
      sources: [{
        chunkId: 'sql-result',
        documentName: dbName,
        pageNumber: 1,
        section: 'Executed SQL Query',
        content: `QUERY:\n${generatedSql}\n\nRESULTS:\n${JSON.stringify(results, null, 2)}`,
        score: 1.0
      }],
      grounded: true
    };

  } finally {
    db.close();
  }
}
