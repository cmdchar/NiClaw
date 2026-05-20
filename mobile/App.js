import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createClawXClient } from './api';

export default function App() {
  const [config, setConfig] = useState({ url: '', token: '' });
  const [connected, setConnected] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission]);

  const handleConnect = async (customConfig = config) => {
    setLoading(true);
    try {
      const client = createClawXClient(customConfig);
      const data = await client.getWorkspaces();
      if (data && data.success && Array.isArray(data.agents)) {
        setWorkspaces(data.agents);
        setConnected(true);
        setConfig(customConfig);
      } else {
        alert('Connection failed. Check URL and Token.');
      }
    } catch (e) {
      alert('Error connecting: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = ({ data }) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed.url && parsed.token) {
        handleConnect(parsed);
      }
    } catch (e) {
      alert('Invalid QR Code');
    }
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.content}>
          <Text style={styles.title}>ClawX AI OS</Text>
          <Text style={styles.subtitle}>Mobile Companion</Text>

          {scanning ? (
            <View style={styles.scannerContainer}>
              <CameraView
                onBarcodeScanned={onBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ["qr"],
                }}
                style={StyleSheet.absoluteFillObject}
              />
              <TouchableOpacity style={styles.cancelButton} onPress={() => setScanning(false)}>
                <Text style={styles.buttonText}>Cancel Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <TextInput
                placeholder="Endpoint URL (e.g. http://192.168.1.10:13210)"
                value={config.url}
                onChangeText={t => setConfig({...config, url: t})}
                style={styles.input}
                autoCapitalize="none"
              />
              <TextInput
                placeholder="Pairing Token"
                value={config.token}
                onChangeText={t => setConfig({...config, token: t})}
                secureTextEntry
                style={styles.input}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={() => handleConnect()}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Connect Manually</Text>}
              </TouchableOpacity>

              <Text style={styles.or}>— OR —</Text>

              <TouchableOpacity
                style={styles.qrButton}
                onPress={() => setScanning(true)}
              >
                <Text style={styles.qrButtonText}>Scan Pairing QR Code</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Workspaces</Text>
        <TouchableOpacity onPress={() => setConnected(false)}>
          <Text style={styles.logoutText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={workspaces}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{item.role || 'Agent'}</Text>
              </View>
            </View>
            <Text style={styles.cardDesc} numberOfLines={2}>{item.description || 'No description set.'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { flex: 1, padding: 30, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800', color: '#1a1a1a', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 40 },
  form: { width: '100%' },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee', fontSize: 14 },
  button: { backgroundColor: '#007AFF', borderRadius: 12, padding: 18, alignItems: 'center', shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  or: { textAlign: 'center', marginVertical: 20, color: '#999', fontSize: 12, fontWeight: '700' },
  qrButton: { backgroundColor: '#fff', borderRadius: 12, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#007AFF' },
  qrButtonText: { color: '#007AFF', fontWeight: '700', fontSize: 16 },
  scannerContainer: { width: '100%', aspectRatio: 1, borderRadius: 24, overflow: 'hidden', position: 'relative' },
  cancelButton: { position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  logoutText: { color: '#ff3b30', fontWeight: '600' },
  list: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  roleBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleText: { fontSize: 10, fontWeight: '800', color: '#666', textTransform: 'uppercase' },
  cardDesc: { fontSize: 14, color: '#666', lineHeight: 20 }
});
