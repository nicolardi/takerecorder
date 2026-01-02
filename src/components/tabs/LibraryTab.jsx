import React from 'react';
import { FolderOpen, RefreshCw, ChevronDown, ChevronRight, Edit3, Trash2, User, BookOpen, Music, Check, X, Play, CheckCircle } from 'lucide-react';
import { formatTime, formatTakeDuration, countTotalTakes } from '../../utils/formatters';

// Componente per i Take (riutilizzabile)
function TakeRow({
  take,
  index,
  parentName,
  editingItem,
  editingName,
  setEditingName,
  saveEditing,
  cancelEditing,
  playTakeFromLibrary,
  bgClass = 'bg-gray-700/50',
}) {
  const isEditing = editingItem?.type === 'take' && editingItem?.id === take.id;

  return (
    <div className={`flex items-center justify-between py-1 px-1 ${bgClass} rounded`}>
      {isEditing ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditing();
              if (e.key === 'Escape') cancelEditing();
            }}
            className="flex-1 bg-gray-500 text-white text-xs px-2 py-1 rounded border border-blue-500 outline-none"
            autoFocus
          />
          <button onClick={saveEditing} className="p-1 text-green-400">
            <Check className="w-3 h-3" />
          </button>
          <button onClick={cancelEditing} className="p-1 text-gray-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => playTakeFromLibrary(take, index, parentName)}
          className="flex-1 flex items-center gap-2"
        >
          <Play className="w-4 h-4 text-white" />
          <span className="text-white text-xs">{take.name || `Take ${index + 1}`}</span>
          {take.duration > 0 && <span className="text-blue-400 text-xs">{formatTakeDuration(take.duration)}</span>}
          <span className="text-gray-400 text-xs">{formatTime(take.createdAt)}</span>
        </button>
      )}
    </div>
  );
}

// Componente Fragment
function FragmentItem({
  fragment,
  track,
  opera,
  author,
  expanded,
  onToggle,
  editingItem,
  editingName,
  setEditingName,
  saveEditing,
  cancelEditing,
  startEditing,
  handleDeleteFragment,
  selectFragmentAsSession,
  playTakeFromLibrary,
}) {
  const isEditing = editingItem?.type === 'fragment' && editingItem?.id === fragment.id;

  return (
    <div className="bg-green-900/30 border border-green-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-1.5">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
              className="flex-1 bg-green-800/50 text-green-100 text-xs px-2 py-1 rounded border border-green-500 outline-none"
              autoFocus
            />
            <button onClick={saveEditing} className="p-1 text-green-400">
              <Check className="w-3 h-3" />
            </button>
            <button onClick={cancelEditing} className="p-1 text-gray-400">
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggle} className="flex-1 flex items-center gap-1">
              {expanded ? (
                <ChevronDown className="w-3 h-3 text-green-400" />
              ) : (
                <ChevronRight className="w-3 h-3 text-gray-400" />
              )}
              <span className="text-green-200 text-xs">{fragment.name}</span>
              <span className="text-green-500/60 text-[10px]">({fragment.takes?.length || 0})</span>
            </button>
            <button
              onClick={() => selectFragmentAsSession(fragment, track, opera, author)}
              className="p-1 text-blue-400 active:text-blue-300"
              title="Seleziona questo brano"
            >
              <CheckCircle className="w-3 h-3" />
            </button>
            <button
              onClick={() => startEditing('fragment', fragment.id, fragment.name)}
              className="p-1 text-green-400 active:text-green-300"
            >
              <Edit3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => handleDeleteFragment(fragment.id)}
              className="p-1 text-red-400 active:text-red-300"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {expanded && fragment.takes?.length > 0 && (
        <div className="px-1.5 pb-1.5 space-y-1">
          {fragment.takes.map((take, index) => (
            <TakeRow
              key={take.id}
              take={take}
              index={index}
              parentName={fragment.name}
              editingItem={editingItem}
              editingName={editingName}
              setEditingName={setEditingName}
              saveEditing={saveEditing}
              cancelEditing={cancelEditing}
              playTakeFromLibrary={playTakeFromLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente Track
function TrackItem({
  track,
  opera,
  author,
  expanded,
  onToggle,
  expandedFragments,
  toggleFragment,
  editingItem,
  editingName,
  setEditingName,
  saveEditing,
  cancelEditing,
  startEditing,
  handleDeleteTrack,
  handleDeleteFragment,
  selectFragmentAsSession,
  playTakeFromLibrary,
  isTopLevel = false,
}) {
  const isEditing = editingItem?.type === 'track' && editingItem?.id === track.id;
  const padding = isTopLevel ? 'p-3' : 'p-2';
  const buttonPadding = isTopLevel ? 'p-3' : 'p-2.5';

  return (
    <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg overflow-hidden">
      <div className={`flex items-center justify-between ${padding}`}>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-purple-400" />
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
              className="flex-1 bg-purple-800/50 text-white text-sm px-2 py-1 rounded border border-purple-500 outline-none"
              autoFocus
            />
            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggle} className="flex-1 flex items-center gap-2">
              {expanded ? (
                <ChevronDown className={`${isTopLevel ? 'w-4 h-4' : 'w-3 h-3'} text-purple-400`} />
              ) : (
                <ChevronRight className={`${isTopLevel ? 'w-4 h-4' : 'w-3 h-3'} text-gray-400`} />
              )}
              <FolderOpen className="w-4 h-4 text-purple-400" />
              <span className={`text-white text-sm ${isTopLevel ? 'font-medium' : ''}`}>{track.name}</span>
              <span className="text-gray-400 text-xs">({countTotalTakes(track)} take)</span>
            </button>
            <button
              onClick={() => startEditing('track', track.id, track.name)}
              className={`${buttonPadding} text-purple-400 active:text-purple-300`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteTrack(track.id)}
              className={`${buttonPadding} text-red-400 active:text-red-300`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className={`${isTopLevel ? 'px-3 pb-3' : 'px-2 pb-2'} space-y-1`}>
          {/* Take orfani (senza fragment) */}
          {track.orphanTakes?.length > 0 && (
            <div className="bg-gray-700/30 rounded p-2 space-y-1">
              <p className="text-gray-400 text-xs mb-1">Take diretti:</p>
              {track.orphanTakes.map((take, index) => (
                <TakeRow
                  key={take.id}
                  take={take}
                  index={index}
                  parentName={track.name}
                  editingItem={editingItem}
                  editingName={editingName}
                  setEditingName={setEditingName}
                  saveEditing={saveEditing}
                  cancelEditing={cancelEditing}
                  playTakeFromLibrary={playTakeFromLibrary}
                  bgClass="bg-gray-600/30"
                />
              ))}
            </div>
          )}

          {/* Frammenti */}
          {track.fragments?.map((fragment) => (
            <FragmentItem
              key={fragment.id}
              fragment={fragment}
              track={track}
              opera={opera}
              author={author}
              expanded={expandedFragments[fragment.id]}
              onToggle={() => toggleFragment(fragment.id)}
              editingItem={editingItem}
              editingName={editingName}
              setEditingName={setEditingName}
              saveEditing={saveEditing}
              cancelEditing={cancelEditing}
              startEditing={startEditing}
              handleDeleteFragment={handleDeleteFragment}
              selectFragmentAsSession={selectFragmentAsSession}
              playTakeFromLibrary={playTakeFromLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente Opera
function OperaItem({
  opera,
  author,
  expanded,
  onToggle,
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
  handleDeleteOpera,
  handleDeleteTrack,
  handleDeleteFragment,
  selectFragmentAsSession,
  playTakeFromLibrary,
  isTopLevel = false,
}) {
  const isEditing = editingItem?.type === 'opera' && editingItem?.id === opera.id;
  const padding = isTopLevel ? 'p-3' : 'p-2';
  const buttonPadding = isTopLevel ? 'p-3' : 'p-2.5';

  return (
    <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg overflow-hidden">
      <div className={`flex items-center justify-between ${padding}`}>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-yellow-400" />
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
              className="flex-1 bg-yellow-800/50 text-yellow-100 text-sm px-2 py-1 rounded border border-yellow-500 outline-none"
              autoFocus
            />
            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggle} className="flex-1 flex items-center gap-2">
              {expanded ? (
                <ChevronDown className={`${isTopLevel ? 'w-4 h-4' : 'w-3 h-3'} text-yellow-400`} />
              ) : (
                <ChevronRight className={`${isTopLevel ? 'w-4 h-4' : 'w-3 h-3'} text-gray-400`} />
              )}
              <BookOpen className="w-4 h-4 text-yellow-400" />
              <span className={`text-yellow-100 text-sm ${isTopLevel ? 'font-medium' : ''}`}>{opera.name}</span>
              <span className="text-yellow-500/60 text-xs">({countTotalTakes(opera)} take)</span>
            </button>
            <button
              onClick={() => startEditing('opera', opera.id, opera.name)}
              className={`${buttonPadding} text-yellow-400 active:text-yellow-300`}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteOpera(opera.id)}
              className={`${buttonPadding} text-red-400 active:text-red-300`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className={`${isTopLevel ? 'px-3 pb-3' : 'px-2 pb-2'} space-y-2`}>
          {opera.tracks?.map((track) => (
            <TrackItem
              key={track.id}
              track={track}
              opera={opera}
              author={author}
              expanded={expandedTracks[track.id]}
              onToggle={() => toggleTrack(track.id)}
              expandedFragments={expandedFragments}
              toggleFragment={toggleFragment}
              editingItem={editingItem}
              editingName={editingName}
              setEditingName={setEditingName}
              saveEditing={saveEditing}
              cancelEditing={cancelEditing}
              startEditing={startEditing}
              handleDeleteTrack={handleDeleteTrack}
              handleDeleteFragment={handleDeleteFragment}
              selectFragmentAsSession={selectFragmentAsSession}
              playTakeFromLibrary={playTakeFromLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Componente Author
function AuthorItem({
  author,
  expanded,
  onToggle,
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
  playTakeFromLibrary,
}) {
  const isEditing = editingItem?.type === 'author' && editingItem?.id === author.id;

  return (
    <div className="bg-cyan-900/30 border border-cyan-700/50 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3">
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing();
                if (e.key === 'Escape') cancelEditing();
              }}
              className="flex-1 bg-cyan-800/50 text-cyan-100 text-sm px-2 py-1 rounded border border-cyan-500 outline-none"
              autoFocus
            />
            <button onClick={saveEditing} className="p-1 text-green-400 active:text-green-300">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancelEditing} className="p-1 text-gray-400 active:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <button onClick={onToggle} className="flex-1 flex items-center gap-2">
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <User className="w-4 h-4 text-cyan-400" />
              <span className="text-cyan-100 text-sm font-medium">{author.name}</span>
              <span className="text-cyan-500/60 text-xs">({countTotalTakes(author)} take)</span>
            </button>
            <button
              onClick={() => startEditing('author', author.id, author.name)}
              className="p-3 text-cyan-400 active:text-cyan-300"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeleteAuthor(author.id)}
              className="p-3 text-red-400 active:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {author.operas?.map((opera) => (
            <OperaItem
              key={opera.id}
              opera={opera}
              author={author}
              expanded={expandedOperas[opera.id]}
              onToggle={() => toggleOpera(opera.id)}
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
              handleDeleteOpera={handleDeleteOpera}
              handleDeleteTrack={handleDeleteTrack}
              handleDeleteFragment={handleDeleteFragment}
              selectFragmentAsSession={selectFragmentAsSession}
              playTakeFromLibrary={playTakeFromLibrary}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryTab({
  isDark = true,
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
  playTakeFromLibrary,
}) {
  return (
    <div className={`h-full overflow-y-auto p-4 pb-20 ${isDark ? 'bg-gray-950' : 'bg-white'}`}>
      <div className="flex items-center gap-2 mb-4">
        <FolderOpen className="w-5 h-5 text-purple-400" />
        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Libreria</h2>
        <span className="text-gray-500 text-xs">({library.length} elementi)</span>
        <button
          onClick={loadLibrary}
          className="ml-auto p-2 text-gray-400 hover:text-white"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Lista libreria */}
      <div className="space-y-2">
        {library.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">Libreria vuota</p>
            <p className="text-gray-600 text-sm mt-1">Registra e salva qualcosa per vederlo qui</p>
            <button
              onClick={loadLibrary}
              className="mt-3 text-purple-400 text-xs underline"
            >
              Ricarica libreria
            </button>
          </div>
        ) : (
          library.map((item) => (
            item.type === 'author' ? (
              <AuthorItem
                key={item.id}
                author={item}
                expanded={expandedAuthors[item.id]}
                onToggle={() => toggleAuthor(item.id)}
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
            ) : item.type === 'opera' ? (
              <OperaItem
                key={item.id}
                opera={item}
                author={null}
                expanded={expandedOperas[item.id]}
                onToggle={() => toggleOpera(item.id)}
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
                handleDeleteOpera={handleDeleteOpera}
                handleDeleteTrack={handleDeleteTrack}
                handleDeleteFragment={handleDeleteFragment}
                selectFragmentAsSession={selectFragmentAsSession}
                playTakeFromLibrary={playTakeFromLibrary}
                isTopLevel
              />
            ) : (
              <TrackItem
                key={item.id}
                track={item}
                opera={null}
                author={null}
                expanded={expandedTracks[item.id]}
                onToggle={() => toggleTrack(item.id)}
                expandedFragments={expandedFragments}
                toggleFragment={toggleFragment}
                editingItem={editingItem}
                editingName={editingName}
                setEditingName={setEditingName}
                saveEditing={saveEditing}
                cancelEditing={cancelEditing}
                startEditing={startEditing}
                handleDeleteTrack={handleDeleteTrack}
                handleDeleteFragment={handleDeleteFragment}
                selectFragmentAsSession={selectFragmentAsSession}
                playTakeFromLibrary={playTakeFromLibrary}
                isTopLevel
              />
            )
          ))
        )}
      </div>
    </div>
  );
}

export default LibraryTab;
