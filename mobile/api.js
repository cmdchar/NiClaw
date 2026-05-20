// Unified API Client for Mobile -> Desktop Bridge
export const createClawXClient = (config) => {
  const { url, token } = config;

  const fetchApi = async (path, options = {}) => {
    const response = await fetch(`${url}${path}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  };

  return {
    getWorkspaces: () => fetchApi('/api/agents'),
    sendMessage: (message) => fetchApi('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ message })
    }),
    getStatus: () => fetchApi('/api/gateway/status'),
  };
};
