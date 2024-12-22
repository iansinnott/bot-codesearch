// File: src/openai.ts

export async function openaiChat(
  messages: { role: "system" | "user" | "assistant"; content: string }[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4", // or set dynamically
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      temperature: 0.2,
      // You can tune other parameters or add streaming if you want
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${text}`);
  }

  const data = await response.json();
  // We assume one choice was returned:
  return data.choices[0].message.content.trim();
}