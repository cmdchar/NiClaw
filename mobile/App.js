import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList } from 'react-native';
import { createClawXClient } from './api';

export default function App() {
  const [config, setConfig] = useState({ url: '', token: '' });
  const [connected, setConnected] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);

  const handleConnect = async () => {
    const client = createClawXClient(config);
    const data = await client.getWorkspaces();
    if (data.success) {
      setWorkspaces(data.agents);
      setConnected(true);
    }
  };

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ClawX AI OS Mobile</Text>
        <TextInput
          placeholder="Endpoint URL"
          value={config.url}
          onChangeText={t => setConfig({...config, url: t})}
          style={styles.input}
        />
        <TextInput
          placeholder="Pairing Token"
          value={config.token}
          onChangeText={t => setConfig({...config, token: t})}
          secureTextEntry
          style={styles.input}
        />
        <Button title="Connect to AI OS" onPress={handleConnect} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connected Workspaces</Text>
      <FlatList
        data={workspaces}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardRole}>{item.role || 'Agent'}</Text>
          </View>
        )}
      />
      <Button title="Disconnect" onPress={() => setConnected(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { borderBottomWidth: 1, width: '100%', marginBottom: 15, padding: 8 },
  card: { padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee', width: '100%' },
  cardTitle: { fontWeight: 'bold' },
  cardRole: { fontSize: 12, color: '#666' }
});
