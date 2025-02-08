import { QueryTypes } from "sequelize";
import sequelize from "../../config/database";
import openai from "../../config/openai";
import { logError } from "../../config/firebaseAdmin";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  return response.data[0].embedding;
}

export async function findSimilarTexts(
  query: string,
  noteId: string,
  limit: number = 5
): Promise<Array<{ content: string; similarity: number }>> {
  try {
    const queryEmbedding = await generateEmbedding(query);
    const sql = `
      SELECT 
        nc.content,
        1 - (nc.embedding <=> CAST(:queryEmbedding AS VECTOR)) as similarity
      FROM note_chunks nc
      INNER JOIN notes n ON n.id = nc.note_id
      WHERE n.id = :noteId 
        AND 1 - (nc.embedding <=> CAST(:queryEmbedding AS VECTOR)) > 0.1
      ORDER BY similarity DESC
      LIMIT :limit
    `;

    const results = await sequelize.query(sql, {
      type: QueryTypes.SELECT,
      replacements: {
        queryEmbedding: `[${queryEmbedding.join(",")}]`,
        noteId,
        limit,
      },
    });

    return results as Array<{ content: string; similarity: number }>;
  } catch (error) {
    await logError(error as Error, {
      context: "findSimilarTexts",
      query,
      noteId,
    });
    throw error;
  }
}

export async function findContext(
  query: string,
  note_id: string,
  limit: number = 3
): Promise<string> {
  const similarTexts = await findSimilarTexts(query, note_id, limit);
  const context = similarTexts.map((text) => text.content).join("\n");
  return context;
}
