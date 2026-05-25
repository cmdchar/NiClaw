import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, SafeAreaView, StatusBar, ActivityIndicator, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { createClawXClient } from './api';
import { Ionicons } from '@expo/vector-icons';

export default function App() {
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [connected, setConnected] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState('Session');

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
    // Load saved servers from persistence (mocked for now)
    setServers([{ id: '1', url: 'localhost:18924', version: 'v1.15.5', name: 'Primary AI OS' }]);
  }, [permission]);

  const handleConnect = async (serverConfig) => {
    setLoading(true);
    try {
      // In a real mobile app, we use the pairing token and secure bridge
      // For now we simulate the connection to the AI OS
      setConnected(true);
      setActiveServer(serverConfig);
      // Mock workspace data for the OS
      setWorkspaces([
        { id: 'w1', name: 'Strategic Planner', role: 'CEO', status: 'Idle' },
        { id: 'w2', name: 'Research Node', role: 'Researcher', status: 'Running' },
        { id: 'w3', name: 'System Auditor', role: 'QA', status: 'Idle' }
      ]);
    } catch (e) {
      alert('Connection failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const onBarcodeScanned = ({ data }) => {
    setScanning(false);
    try {
      const parsed = JSON.parse(data);
      if (parsed.url) {
        handleConnect({ url: parsed.url, token: parsed.token, name: 'New AI OS Server' });
      }
    } catch (e) {
      alert('Invalid pairing code');
    }
  };

  if (!connected) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>OpenCode</Text>
          <View style={styles.headerIcons}>
             <Ionicons name="refresh-outline" size={24} color="black" style={{ marginRight: 15 }} />
             <Ionicons name="share-outline" size={24} color="black" />
          </View>
        </View>

        <View style={styles.serverList}>
          <Text style={styles.sectionTitle}>Servers</Text>
          <FlatList
            data={servers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.serverCard} onPress={() => handleConnect(item)}>
                <View style={styles.statusIndicator} />
                <View style={styles.serverInfo}>
                  <Text style={styles.serverUrl}>{item.url} <Text style={styles.versionText}>{item.version}</Text></Text>
                  <Text style={styles.usernameText}>no username</Text>
                </View>
                <Ionicons name="checkmark" size={20} color="#007AFF" />
                <Ionicons name="ellipsis-horizontal" size={20} color="#ccc" style={{ marginLeft: 15 }} />
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={styles.addServerButton} onPress={() => setScanning(true)}>
             <Ionicons name="plus" size={20} color="black" />
             <Text style={styles.addServerText}>Add server</Text>
          </TouchableOpacity>
        </View>

        {scanning && (
          <View style={styles.fullscreenScanner}>
             <CameraView
                onBarcodeScanned={onBarcodeScanned}
                style={StyleSheet.absoluteFillObject}
              />
              <TouchableOpacity style={styles.closeScanner} onPress={() => setScanning(false)}>
                 <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="menu-outline" size={24} color="black" />
        <Text style={styles.headerTitle}>AI OS Companion</Text>
        <Ionicons name="terminal-outline" size={24} color="black" />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Session' && styles.activeTab]}
          onPress={() => setActiveTab('Session')}
        >
          <Text style={[styles.tabText, activeTab === 'Session' && styles.activeTabText]}>Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'Changes' && styles.activeTab]}
          onPress={() => setActiveTab('Changes')}
        >
          <Text style={[styles.tabText, activeTab === 'Changes' && styles.activeTabText]}>Changes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContent}>
         <FlatList
            data={workspaces}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.agentCard}>
                 <View style={styles.agentHeader}>
                    <Text style={styles.agentName}>{item.name}</Text>
                    <Badge role={item.role} />
                 </View>
                 <Text style={styles.agentStatus}>{item.status}</Text>
              </View>
            )}
         />
      </View>

      <View style={styles.inputBar}>
         <View style={styles.inputContainer}>
            <TextInput placeholder="Ask anything..." style={styles.textInput} />
            <TouchableOpacity style={styles.sendButton}>
               <Ionicons name="square" size={20} color="white" />
            </TouchableOpacity>
         </View>
         <View style={styles.inputFooter}>
            <View style={styles.footerItem}><Text style={styles.footerText}>Build</Text><Ionicons name="chevron-down" size={12} color="#666" /></View>
            <View style={styles.footerItem}><Ionicons name="layers-outline" size={14} color="#666" style={{ marginRight: 4 }} /><Text style={styles.footerText}>DeepSeek V4 Flash</Text><Ionicons name="chevron-down" size={12} color="#666" /></View>
            <Text style={styles.footerText}>Default</Text>
         </View>
      </View>
    </SafeAreaView>
  );
}

function Badge({ role }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{role}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerIcons: { flexDirection: 'row' },
  serverList: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 20 },
  serverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 15, borderRadius: 12, marginBottom: 15 },
  statusIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 15 },
  serverInfo: { flex: 1 },
  serverUrl: { fontSize: 16, fontWeight: '600' },
  versionText: { fontSize: 14, fontWeight: '400', color: '#999' },
  usernameText: { fontSize: 12, color: '#999', marginTop: 2 },
  addServerButton: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 12, width: 140, marginTop: 10 },
  addServerText: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
  fullscreenScanner: { ...StyleSheet.absoluteFillObject, backgroundColor: 'black' },
  closeScanner: { position: 'absolute', top: 50, right: 20 },
  tabBar: { flexDirection: 'row', height: 50, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#000' },
  tabText: { fontSize: 16, color: '#999' },
  activeTabText: { color: '#000', fontWeight: '600' },
  mainContent: { flex: 1, backgroundColor: '#fcfcfc', padding: 15 },
  agentCard: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 0.5, borderColor: '#eee' },
  agentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agentName: { fontSize: 16, fontWeight: '600' },
  agentStatus: { fontSize: 12, color: '#4CAF50', marginTop: 4 },
  badge: { backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#666' },
  inputBar: { padding: 15, borderTopWidth: 0.5, borderTopColor: '#eee' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 20, padding: 10, height: 100, alignItems: 'flex-start' },
  textInput: { flex: 1, padding: 10, fontSize: 16 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 5 },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: 12, color: '#666' }
});
