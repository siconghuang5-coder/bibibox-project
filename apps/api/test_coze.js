async function test() {
  const token = 'pat_8mm90XTfXds3xK4xu3vKYs4ovmn65FDOIHALRWhQPEgyEBiNh8DjTjbQLj1TF6uB';
  const botId = '7631486690280587264';
  const baseUrl = 'https://api.coze.cn';

  const res = await fetch(baseUrl + '/v3/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      bot_id: botId,
      user_id: 'ai-social-system',
      stream: false,
      additional_messages: [
        {
          role: 'user',
          content: 'Õ¦Á·ÐØ',
          content_type: 'text',
        },
      ],
    }),
  });

  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('RESPONSE:', text);
}
test().catch(console.error);
