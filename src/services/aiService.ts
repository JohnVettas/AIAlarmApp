// @ts-ignore
import { GROQ_API_KEY } from '@env';

export async function generateAlarmScript(
  title: string,
  description: string,
  time: Date,
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
            Your job is to write a short paragraph (2-3 sentences max) to notify the user of the activity they have planned. 
            It must be written explicitly to be read aloud by a text-to-speech engine. 
            Do not include emojis, markdown, or text layout formatting
            Also do not add any extra information that is not mentioned in the description.
            Alway start the paragraph with "It's (day of the week), (time)." and then mention the planned activity.`,
            },
            {
              role: 'user',
              content: `Alarm Title: ${title}\nUser Context Prompt: ${
                description || 'No description provided.'
              }\nScheduled Time: ${time.toLocaleString()}`,
            },
          ],
          max_tokens: 150,
          temperature: 0.5,
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
