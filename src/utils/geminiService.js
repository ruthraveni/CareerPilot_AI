export async function generateContent(prompt) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    console.log('Gemini response:', data);
    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const text = data.candidates[0].content.parts.map(p => p.text).join(' ').trim();
      return { text, error: false };
    }
    return { text: null, error: true };
  } catch (e) {
    console.error('Gemini API error:', e);
    return { text: null, error: true };
  }
}
