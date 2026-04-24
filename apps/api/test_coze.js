const token = 'pat_y84h4MRBUeVCXavPjV167G0ARLD0UhRGdLz3MNLxEdbSZfLZ20g0gWwuEGxqWZtG';
const botId = '7631486690280587264'; // Mike's botId
const baseUrl = 'https://api.coze.cn';

async function testCoze() {
  try {
    const chatInitResponse = await fetch(`${baseUrl}/v3/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        bot_id: botId,
        user_id: 'ai-social-system',
        stream: false,
        additional_messages: [
          {
            role: 'user',
            content: 'hi',
            content_type: 'text',
          },
        ],
      }),
    });
    const initData = await chatInitResponse.json();
    
    if (!initData.data) return;
    
    const chatId = initData.data.id;
    const conversationId = initData.data.conversation_id;
    
    let status = initData.data.status;
    let attempts = 0;
    while (status !== 'completed' && attempts < 5) {
      await new Promise((r) => setTimeout(r, 800));
      const retrieveRes = await fetch(
        `${baseUrl}/v3/chat/retrieve?conversation_id=${conversationId}&chat_id=${chatId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const retrieveData = await retrieveRes.json();
      status = retrieveData.data.status;
      console.log('status:', status);
      if (status === 'failed' || status === 'canceled') {
          console.log('error:', retrieveData.data.last_error);
          break;
      }
      attempts++;
    }
  } catch (err) {
    console.error(err);
  }
}

testCoze();
