import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { SessionProvider, useSession } from './contexts/SessionContext';
import { RecordingProvider, useRecording } from './contexts/RecordingContext';
import { BottomTabBar } from './components/BottomTabBar';
import { RecordPage } from './pages/RecordPage';
import { SessionsTab } from './components/tabs/SessionsTab';
import { LibraryTab } from './components/tabs/LibraryTab';
import { StatisticsTab } from './components/tabs/StatisticsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { TakePlayerModal } from './components/modals/TakePlayerModal';
import { deleteTake } from './videoLibrary';

// Map routes to tab IDs
const routeToTab = {
  '/': 'registra',
  '/takes': 'takes',
  '/libreria': 'libreria',
  '/statistiche': 'statistiche',
  '/impostazioni': 'impostazioni',
};

const tabToRoute = {
  'registra': '/',
  'takes': '/takes',
  'libreria': '/libreria',
  'statistiche': '/statistiche',
  'impostazioni': '/impostazioni',
};

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentSession,
    setShowSessionPicker,
    library,
    loadLibrary,
    expandedAuthors,
    toggleAuthor,
    expandedOperas,
    toggleOpera,
    expandedTracks,
    toggleTrack,
    expandedFragments,
    toggleFragment,
    editingItem,
    editingName,
    setEditingName,
    saveEditing,
    cancelEditing,
    startEditing,
    handleDeleteAuthor,
    handleDeleteOpera,
    handleDeleteTrack,
    handleDeleteFragment,
    selectFragmentAsSession,
  } = useSession();

  const {
    settings,
    updateSetting,
    isDark,
    isIncognito,
    isRecording,
    leftPedalKey,
    rightPedalKey,
    isListeningForKey,
    setIsListeningForKey,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
  } = useRecording();

  // Playing take state (for library playback)
  const [playingTake, setPlayingTake] = useState(null);

  // Get current tab from route
  const activeTab = routeToTab[location.pathname] || 'registra';

  // Handle tab change
  const handleTabChange = (tabId) => {
    navigate(tabToRoute[tabId]);
  };

  // Handle session selection from SessionsTab
  const handleSelectSessionFromTab = (session) => {
    selectFragmentAsSession(
      session.fragmentId ? { id: session.fragmentId, name: session.fragmentName } : null,
      { id: session.trackId, name: session.trackName },
      session.operaId ? { id: session.operaId, name: session.operaName } : null,
      session.authorId ? { id: session.authorId, name: session.authorName } : null,
      false
    );
    navigate('/');
  };

  // Play take from library
  const playTakeFromLibrary = (take, index, fragmentName) => {
    const url = URL.createObjectURL(take.videoBlob);
    setPlayingTake({
      url,
      mimeType: take.mimeType,
      index,
      fragmentName,
      id: take.id,
      videoBlob: take.videoBlob,
    });
  };

  // Close playing take
  const closePlayingTake = () => {
    if (playingTake?.url) {
      URL.revokeObjectURL(playingTake.url);
    }
    setPlayingTake(null);
  };

  // Tag playing take - chiude la modale e apre il picker
  const tagPlayingTake = () => {
    const onTagCallback = playingTake?.onTag;
    // Chiudi la modale prima (senza revocare l'URL perché il take serve ancora)
    setPlayingTake(null);
    // Poi apri il picker
    if (onTagCallback) {
      onTagCallback();
    }
  };

  // Share playing take
  const sharePlayingTake = async () => {
    if (!playingTake?.videoBlob) return;
    try {
      const extension = playingTake.mimeType?.includes('video') ? 'webm' : 'webm';
      const filename = `take_${Date.now()}.${extension}`;
      const file = new File([playingTake.videoBlob], filename, { type: playingTake.mimeType });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Take registrato' });
      } else {
        const url = URL.createObjectURL(playingTake.videoBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Errore condivisione:', error);
    }
  };

  // Delete playing take
  const deletePlayingTake = async () => {
    if (!playingTake?.id) return;
    if (!confirm('Eliminare questo take?')) return;
    try {
      await deleteTake(playingTake.id);
      await loadLibrary();
      closePlayingTake();
    } catch (error) {
      console.error('Errore eliminazione take:', error);
    }
  };

  return (
    <div className={`fixed inset-0 flex flex-col ${isDark ? 'bg-black' : 'bg-gray-100'}`}>
      {/* Main content area with padding for bottom tab bar */}
      <div className="flex-1 relative overflow-hidden pb-16">
        <Routes>
          <Route path="/" element={<RecordPage />} />
          <Route
            path="/takes"
            element={
              <SessionsTab
                onSelectSession={handleSelectSessionFromTab}
                onPlayTake={(take) => setPlayingTake(take)}
                isDark={isDark}
              />
            }
          />
          <Route
            path="/libreria"
            element={
              <LibraryTab
                isDark={isDark}
                library={library}
                loadLibrary={loadLibrary}
                expandedAuthors={expandedAuthors}
                toggleAuthor={toggleAuthor}
                expandedOperas={expandedOperas}
                toggleOpera={toggleOpera}
                expandedTracks={expandedTracks}
                toggleTrack={toggleTrack}
                expandedFragments={expandedFragments}
                toggleFragment={toggleFragment}
                editingItem={editingItem}
                editingName={editingName}
                setEditingName={setEditingName}
                saveEditing={saveEditing}
                cancelEditing={cancelEditing}
                startEditing={startEditing}
                handleDeleteAuthor={handleDeleteAuthor}
                handleDeleteOpera={handleDeleteOpera}
                handleDeleteTrack={handleDeleteTrack}
                handleDeleteFragment={handleDeleteFragment}
                selectFragmentAsSession={selectFragmentAsSession}
                playTakeFromLibrary={playTakeFromLibrary}
              />
            }
          />
          <Route
            path="/statistiche"
            element={<StatisticsTab isDark={isDark} />}
          />
          <Route
            path="/impostazioni"
            element={
              <SettingsTab
                isDark={isDark}
                settings={settings}
                updateSetting={updateSetting}
                leftPedalKey={leftPedalKey}
                rightPedalKey={rightPedalKey}
                isListeningForKey={isListeningForKey}
                setIsListeningForKey={setIsListeningForKey}
                audioFeedbackEnabled={audioFeedbackEnabled}
                setAudioFeedbackEnabled={setAudioFeedbackEnabled}
              />
            }
          />
        </Routes>
      </div>

      {/* Bottom Tab Bar - hidden during recording */}
      <BottomTabBar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        hidden={isRecording}
        isDark={isDark}
        isIncognito={isIncognito}
      />

      {/* Take Player Modal */}
      <TakePlayerModal
        playingTake={playingTake}
        onClose={closePlayingTake}
        onShare={playingTake?.onShare || sharePlayingTake}
        onDelete={deletePlayingTake}
        onTag={playingTake?.onTag ? tagPlayingTake : undefined}
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <RecordingProvider>
          <AppContent />
        </RecordingProvider>
      </SessionProvider>
    </BrowserRouter>
  );
}

export default App;
