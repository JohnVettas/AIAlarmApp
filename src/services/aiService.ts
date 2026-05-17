// @ts-ignore
import { GROQ_API_KEY } from '@env';

export async function generateAlarmScript(
  title: string,
  description: string,
): Promise<string> {
  try {
    if (!GROQ_API_KEY) {
      throw new Error('API Key missing configuration');
    }

    const response = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant', 
          messages: [
            {
              role: 'system',
              content: `You are an energetic, friendly AI morning alarm assistant. 
            Your job is to write a short paragraph (2-3 sentences max) to wake the user up. 
            It must be written explicitly to be read aloud by a text-to-speech engine. 
            Do not include emojis, markdown, or text layout formatting.`,
            },
            {
              role: 'user',
              content: `Alarm Title: ${title}\nUser Context Prompt: ${
                description || 'Just a normal morning wake up.'
              }`,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        }),
      },
    );

    const data = await response.json();

    // console.log("GROQ RAW RESPONSE:", JSON.stringify(data, null, 2));

    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('Invalid response from AI API');
    }
  } catch (error) {
    console.error('AI Generation Failed:', error);
    return `Good morning! It is time to wake up for your alarm: ${title}.`;
  }
}
