import { Router, Request, Response } from "express";
import { authenticateUser } from "../../middlewares/auth";
import { Note } from "../../models/note";
import { logError } from "../../config/firebaseAdmin";
import openai from "../../config/openai";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { NoteMindmap } from "../../models/note-mindmap";

interface MindmapNode {
  id: string;
  parentid?: string;
  topic: string;
  isroot?: boolean;
  explanation?: string;
}

const router = Router();

router.get(
  "/mindmap",
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const { userRecord } = req;
      let { note_id } = req.query;

      note_id = String(note_id);

      if (!userRecord) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!note_id) {
        return res.status(400).json({ error: "Missing note_id" });
      }

      // Verify note ownership and get content
      const note = await Note.findByPk(String(note_id));
      if (!note || note.user_id !== userRecord.id) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (!note.content) {
        return res.status(400).json({ error: "Note has no content" });
      }

      // Check if mindmap already exists
      let nodes = await NoteMindmap.findAll({
        where: { note_id },
      });

      if (nodes.length > 0) {
        return res.json(formatMindmap(nodes));
      }

      const mindmapNodes = await generateMindmap(note_id, note.content);

      nodes = await Promise.all(
        mindmapNodes.map(async (node) => {
          return await NoteMindmap.create({
            note_id,
            ...node,
          });
        })
      );

      return res.json(formatMindmap(nodes));
    } catch (error) {
      console.log(error);
      await logError(error as Error, {
        context: "/note/mindmap",
        note_id: req.query.note_id,
      });
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

async function generateMindmap(
  noteId: string,
  content: string
): Promise<MindmapNode[]> {
  const messages = [
    {
      role: "system",
      content: `You are a mindmap generator. Create a hierarchical mindmap from the provided content.
      The mindmap should:
      - Have a clear root node summarizing the main topic
      - Include major topics as first-level nodes
      - Break down each major topic into subtopics
      - Include a brief explanation for each node (2-3 sentences max)
      - Use concise, clear labels for each node      
      
      Format your response as a JSON object with an array of nodes, where each node has:
      {
        unique_id, // Use format: "1", "1.1", "1.2", "2", "2.1", etc.
        parentid, // Optional for root node
        topic,
        isroot, // true only for root node        
      }
      
      The root node should have id "root" and isroot: true.
      First-level nodes should have ids "1", "2", "3", etc.
      Second-level nodes should have ids "1.1", "1.2", "2.1", etc.
      Each node should have a clear, concise explanation of the concept it represents.`,
    },
    {
      role: "user",
      content: `Create a mindmap from this content:\n\n${content}`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: messages as ChatCompletionMessageParam[],
    temperature: 0.7,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const response = completion.choices[0].message.content;
  if (!response) {
    throw new Error("No content returned from OpenAI");
  }

  const mindmapResponse = JSON.parse(response);
  return mindmapResponse.nodes;
}

function formatMindmap(nodes: NoteMindmap[]): MindmapNode[] {
  return nodes.map((node) => ({
    id: node.unique_id,
    parentid: node.parentid,
    topic: node.topic,
    isroot: node.isroot,
  }));
}

export default router;
