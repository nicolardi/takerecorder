// Video Library Storage using IndexedDB
// Struttura: Autore > Opera > Brano > Frammento > Takes
// Autore e Opera sono opzionali, Brano e Frammento sono richiesti

const DB_NAME = 'VideoRecorderLibrary';
const DB_VERSION = 6; // Aggiunto trackId su takes + sessionHistory

let dbInstance = null;

// Inizializza il database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const tx = event.target.transaction;

      // Helper per aggiungere indici mancanti
      const ensureIndex = (store, indexName, keyPath) => {
        if (!store.indexNames.contains(indexName)) {
          store.createIndex(indexName, keyPath, { unique: false });
        }
      };

      // Store per gli autori (es. "Chopin", "Beethoven")
      if (!db.objectStoreNames.contains('authors')) {
        const authorsStore = db.createObjectStore('authors', { keyPath: 'id' });
        authorsStore.createIndex('name', 'name', { unique: false });
        authorsStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const authorsStore = tx.objectStore('authors');
        ensureIndex(authorsStore, 'name', 'name');
        ensureIndex(authorsStore, 'createdAt', 'createdAt');
      }

      // Store per le opere (es. "Etudes Op. 10", "Sonata n.2")
      if (!db.objectStoreNames.contains('operas')) {
        const operasStore = db.createObjectStore('operas', { keyPath: 'id' });
        operasStore.createIndex('authorId', 'authorId', { unique: false });
        operasStore.createIndex('name', 'name', { unique: false });
        operasStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const operasStore = tx.objectStore('operas');
        ensureIndex(operasStore, 'authorId', 'authorId');
        ensureIndex(operasStore, 'name', 'name');
        ensureIndex(operasStore, 'createdAt', 'createdAt');
      }

      // Store per i brani (es. "Studio n.4", "Primo movimento")
      if (!db.objectStoreNames.contains('tracks')) {
        const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' });
        tracksStore.createIndex('operaId', 'operaId', { unique: false });
        tracksStore.createIndex('name', 'name', { unique: false });
        tracksStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const tracksStore = tx.objectStore('tracks');
        ensureIndex(tracksStore, 'operaId', 'operaId');
        ensureIndex(tracksStore, 'name', 'name');
        ensureIndex(tracksStore, 'createdAt', 'createdAt');
      }

      // Store per i frammenti (es. "Battute 5-7", "Pagina 2")
      if (!db.objectStoreNames.contains('fragments')) {
        const fragmentsStore = db.createObjectStore('fragments', { keyPath: 'id' });
        fragmentsStore.createIndex('trackId', 'trackId', { unique: false });
        fragmentsStore.createIndex('name', 'name', { unique: false });
        fragmentsStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const fragmentsStore = tx.objectStore('fragments');
        ensureIndex(fragmentsStore, 'trackId', 'trackId');
        ensureIndex(fragmentsStore, 'name', 'name');
        ensureIndex(fragmentsStore, 'createdAt', 'createdAt');
      }

      // Store per i takes (video)
      if (!db.objectStoreNames.contains('takes')) {
        const takesStore = db.createObjectStore('takes', { keyPath: 'id' });
        takesStore.createIndex('fragmentId', 'fragmentId', { unique: false });
        takesStore.createIndex('trackId', 'trackId', { unique: false });
        takesStore.createIndex('createdAt', 'createdAt', { unique: false });
      } else {
        const takesStore = tx.objectStore('takes');
        ensureIndex(takesStore, 'fragmentId', 'fragmentId');
        ensureIndex(takesStore, 'trackId', 'trackId');
        ensureIndex(takesStore, 'createdAt', 'createdAt');
      }

      // Store per la cronologia sessioni (sessioni recenti)
      if (!db.objectStoreNames.contains('sessionHistory')) {
        const historyStore = db.createObjectStore('sessionHistory', { keyPath: 'id' });
        historyStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        historyStore.createIndex('sessionKey', 'sessionKey', { unique: true });
      } else {
        const historyStore = tx.objectStore('sessionHistory');
        ensureIndex(historyStore, 'lastUsed', 'lastUsed');
        if (!historyStore.indexNames.contains('sessionKey')) {
          historyStore.createIndex('sessionKey', 'sessionKey', { unique: true });
        }
      }

      // Rimuovi vecchi store se esistono (migrazione)
      if (db.objectStoreNames.contains('collections')) {
        db.deleteObjectStore('collections');
      }
    };
  });
};

// Genera ID univoco
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// ============================================
// AUTORI (Authors) - es. "Chopin", "Beethoven"
// ============================================

export const createAuthor = async (name) => {
  const db = await initDB();
  const author = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('authors', 'readwrite');
    tx.objectStore('authors').add(author);
    tx.oncomplete = () => resolve(author);
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllAuthors = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('authors', 'readonly');
    const request = tx.objectStore('authors').index('createdAt').getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
};

export const deleteAuthor = async (authorId) => {
  const db = await initDB();

  // Elimina tutte le opere di questo autore
  const operas = await getOperasByAuthor(authorId);
  for (const opera of operas) {
    await deleteOpera(opera.id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('authors', 'readwrite');
    tx.objectStore('authors').delete(authorId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const renameAuthor = async (authorId, newName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('authors', 'readwrite');
    const store = tx.objectStore('authors');
    const request = store.get(authorId);
    request.onsuccess = () => {
      const author = request.result;
      if (author) {
        author.name = newName.trim();
        store.put(author);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ============================================
// OPERE (Operas) - es. "Etudes Op. 10"
// ============================================

export const createOpera = async (name, authorId = null) => {
  const db = await initDB();
  const opera = {
    id: generateId(),
    name: name.trim(),
    authorId, // null se non associata a un autore
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('operas', 'readwrite');
    tx.objectStore('operas').add(opera);
    tx.oncomplete = () => resolve(opera);
    tx.onerror = () => reject(tx.error);
  });
};

export const getOperasByAuthor = async (authorId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('operas', 'readonly');
    const index = tx.objectStore('operas').index('authorId');
    const request = index.getAll(authorId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllOperas = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('operas', 'readonly');
    const request = tx.objectStore('operas').index('createdAt').getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
};

export const deleteOpera = async (operaId) => {
  const db = await initDB();

  // Elimina tutti i brani di questa opera
  const tracks = await getTracksByOpera(operaId);
  for (const track of tracks) {
    await deleteTrack(track.id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('operas', 'readwrite');
    tx.objectStore('operas').delete(operaId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const renameOpera = async (operaId, newName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('operas', 'readwrite');
    const store = tx.objectStore('operas');
    const request = store.get(operaId);
    request.onsuccess = () => {
      const opera = request.result;
      if (opera) {
        opera.name = newName.trim();
        store.put(opera);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ============================================
// BRANI (Tracks) - es. "Studio n.4"
// ============================================

export const createTrack = async (name, operaId = null) => {
  const db = await initDB();
  const track = {
    id: generateId(),
    name: name.trim(),
    operaId, // null se non associato a un'opera
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    tx.objectStore('tracks').add(track);
    tx.oncomplete = () => resolve(track);
    tx.onerror = () => reject(tx.error);
  });
};

export const getTracksByOpera = async (operaId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const index = tx.objectStore('tracks').index('operaId');
    const request = index.getAll(operaId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllTracks = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readonly');
    const request = tx.objectStore('tracks').index('createdAt').getAll();
    request.onsuccess = () => resolve(request.result.reverse());
    request.onerror = () => reject(request.error);
  });
};

export const deleteTrack = async (trackId) => {
  const db = await initDB();

  // Elimina tutti i frammenti di questo brano
  const fragments = await getFragmentsByTrack(trackId);
  for (const fragment of fragments) {
    await deleteFragment(fragment.id);
  }

  // Elimina anche i take orfani (direttamente sotto il brano)
  const orphanTakes = await getTakesByTrack(trackId);
  for (const take of orphanTakes) {
    await deleteTake(take.id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    tx.objectStore('tracks').delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const renameTrack = async (trackId, newName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tracks', 'readwrite');
    const store = tx.objectStore('tracks');
    const request = store.get(trackId);
    request.onsuccess = () => {
      const track = request.result;
      if (track) {
        track.name = newName.trim();
        store.put(track);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ============================================
// FRAMMENTI (Fragments) - es. "Battute 5-7", "Pagina 2"
// ============================================

export const createFragment = async (trackId, name) => {
  const db = await initDB();
  const fragment = {
    id: generateId(),
    trackId,
    name: name.trim(),
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragments', 'readwrite');
    tx.objectStore('fragments').add(fragment);
    tx.oncomplete = () => resolve(fragment);
    tx.onerror = () => reject(tx.error);
  });
};

export const getFragmentsByTrack = async (trackId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragments', 'readonly');
    const index = tx.objectStore('fragments').index('trackId');
    const request = index.getAll(trackId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getAllFragments = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragments', 'readonly');
    const request = tx.objectStore('fragments').getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteFragment = async (fragmentId) => {
  const db = await initDB();

  // Elimina tutti i takes di questo frammento
  const takes = await getTakesByFragment(fragmentId);
  for (const take of takes) {
    await deleteTake(take.id);
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragments', 'readwrite');
    tx.objectStore('fragments').delete(fragmentId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const renameFragment = async (fragmentId, newName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('fragments', 'readwrite');
    const store = tx.objectStore('fragments');
    const request = store.get(fragmentId);
    request.onsuccess = () => {
      const fragment = request.result;
      if (fragment) {
        fragment.name = newName.trim();
        store.put(fragment);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// ============================================
// TAKES (Video recordings)
// ============================================

export const saveTake = async (videoBlob, mimeType, trackId = null, fragmentId = null, duration = null, isIncognito = false, name = null) => {
  const db = await initDB();
  const take = {
    id: generateId(),
    trackId, // può essere null per take incognito
    fragmentId, // può essere null per take direttamente sotto il brano
    videoBlob,
    mimeType,
    createdAt: Date.now(),
    duration, // durata in secondi
    isIncognito, // flag per take registrati in modalità incognito
    name, // nome opzionale del take
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readwrite');
    tx.objectStore('takes').add(take);
    tx.oncomplete = () => resolve(take);
    tx.onerror = () => reject(tx.error);
  });
};

// Ottieni take orfani (senza fragment) di un brano
export const getTakesByTrack = async (trackId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readonly');
    const index = tx.objectStore('takes').index('trackId');
    const request = index.getAll(trackId);
    request.onsuccess = () => {
      // Filtra solo i take senza fragmentId (orfani)
      const orphanTakes = request.result.filter(take => !take.fragmentId);
      resolve(orphanTakes);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getTakesByFragment = async (fragmentId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readonly');
    const index = tx.objectStore('takes').index('fragmentId');
    const request = index.getAll(fragmentId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const getTake = async (takeId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readonly');
    const request = tx.objectStore('takes').get(takeId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const deleteTake = async (takeId) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readwrite');
    tx.objectStore('takes').delete(takeId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const renameTake = async (takeId, newName) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readwrite');
    const store = tx.objectStore('takes');
    const request = store.get(takeId);
    request.onsuccess = () => {
      const take = request.result;
      if (take) {
        take.name = newName.trim();
        store.put(take);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Assegna un brano a un take esistente (utile per taggare registrazioni incognito)
export const assignTrackToTake = async (takeId, trackId, fragmentId = null) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readwrite');
    const store = tx.objectStore('takes');
    const request = store.get(takeId);
    request.onsuccess = () => {
      const take = request.result;
      if (take) {
        take.trackId = trackId;
        take.fragmentId = fragmentId;
        // Mantiene isIncognito invariato - il take resta contrassegnato come incognito
        store.put(take);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Ottieni tutti i take ordinati per data (più recenti prima) con dettagli sessione
export const getAllTakesWithDetails = async (limit = 50, offset = 0) => {
  const db = await initDB();

  // Carica tutti i dati di riferimento
  const allAuthors = await getAllAuthors();
  const allOperas = await getAllOperas();
  const allTracks = await getAllTracks();
  const allFragments = await getAllFragments();

  // Crea mappe per lookup veloce
  const authorsMap = new Map(allAuthors.map(a => [a.id, a]));
  const operasMap = new Map(allOperas.map(o => [o.id, o]));
  const tracksMap = new Map(allTracks.map(t => [t.id, t]));
  const fragmentsMap = new Map(allFragments.map(f => [f.id, f]));

  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readonly');
    const store = tx.objectStore('takes');
    const index = store.index('createdAt');
    const results = [];
    let skipped = 0;
    let collected = 0;

    const request = index.openCursor(null, 'prev'); // Più recenti prima

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && collected < limit) {
        if (skipped >= offset) {
          const take = cursor.value;

          // Costruisci i dettagli della sessione
          let sessionDetails = {
            trackId: null,
            trackName: null,
            fragmentId: null,
            fragmentName: null,
            operaId: null,
            operaName: null,
            authorId: null,
            authorName: null,
          };

          if (take.trackId) {
            const track = tracksMap.get(take.trackId);
            if (track) {
              sessionDetails.trackId = track.id;
              sessionDetails.trackName = track.name;

              if (track.operaId) {
                const opera = operasMap.get(track.operaId);
                if (opera) {
                  sessionDetails.operaId = opera.id;
                  sessionDetails.operaName = opera.name;

                  if (opera.authorId) {
                    const author = authorsMap.get(opera.authorId);
                    if (author) {
                      sessionDetails.authorId = author.id;
                      sessionDetails.authorName = author.name;
                    }
                  }
                }
              }
            }
          }

          if (take.fragmentId) {
            const fragment = fragmentsMap.get(take.fragmentId);
            if (fragment) {
              sessionDetails.fragmentId = fragment.id;
              sessionDetails.fragmentName = fragment.name;
            }
          }

          results.push({
            ...take,
            sessionDetails,
          });
          collected++;
        } else {
          skipped++;
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Conta tutti i take
export const getTotalTakesCount = async () => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('takes', 'readonly');
    const store = tx.objectStore('takes');
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// ============================================
// UTILITIES
// ============================================

export const getLibraryStats = async () => {
  const authors = await getAllAuthors();
  const operas = await getAllOperas();
  const tracks = await getAllTracks();
  const fragments = await getAllFragments();

  let totalTakes = 0;
  for (const fragment of fragments) {
    const takes = await getTakesByFragment(fragment.id);
    totalTakes += takes.length;
  }

  return {
    authors: authors.length,
    operas: operas.length,
    tracks: tracks.length,
    fragments: fragments.length,
    takes: totalTakes,
  };
};

// Ottieni struttura completa della libreria
// Struttura: Autore > Opera > Brano > Frammento > Takes
export const getFullLibrary = async () => {
  const authors = await getAllAuthors();
  const allOperas = await getAllOperas();
  const allTracks = await getAllTracks();
  const result = [];

  // Prima gli autori con le loro opere
  for (const author of authors) {
    const authorOperas = allOperas.filter(o => o.authorId === author.id);
    const operasWithTracks = [];

    for (const opera of authorOperas) {
      const operaTracks = allTracks.filter(t => t.operaId === opera.id);
      const tracksWithFragments = [];

      for (const track of operaTracks) {
        const fragments = await getFragmentsByTrack(track.id);
        const fragmentsWithTakes = [];
        const orphanTakes = await getTakesByTrack(track.id);

        for (const fragment of fragments) {
          const takes = await getTakesByFragment(fragment.id);
          fragmentsWithTakes.push({
            ...fragment,
            takes: takes.sort((a, b) => a.createdAt - b.createdAt),
          });
        }

        tracksWithFragments.push({
          ...track,
          fragments: fragmentsWithTakes,
          orphanTakes: orphanTakes.sort((a, b) => a.createdAt - b.createdAt),
        });
      }

      operasWithTracks.push({
        ...opera,
        tracks: tracksWithFragments,
      });
    }

    result.push({
      type: 'author',
      ...author,
      operas: operasWithTracks,
    });
  }

  // Poi le opere senza autore (standalone)
  const standaloneOperas = allOperas.filter(o => !o.authorId);
  for (const opera of standaloneOperas) {
    const operaTracks = allTracks.filter(t => t.operaId === opera.id);
    const tracksWithFragments = [];

    for (const track of operaTracks) {
      const fragments = await getFragmentsByTrack(track.id);
      const fragmentsWithTakes = [];
      const orphanTakes = await getTakesByTrack(track.id);

      for (const fragment of fragments) {
        const takes = await getTakesByFragment(fragment.id);
        fragmentsWithTakes.push({
          ...fragment,
          takes: takes.sort((a, b) => a.createdAt - b.createdAt),
        });
      }

      tracksWithFragments.push({
        ...track,
        fragments: fragmentsWithTakes,
        orphanTakes: orphanTakes.sort((a, b) => a.createdAt - b.createdAt),
      });
    }

    result.push({
      type: 'opera',
      ...opera,
      tracks: tracksWithFragments,
    });
  }

  // Poi i brani senza opera (standalone)
  const standaloneTracks = allTracks.filter(t => !t.operaId);
  for (const track of standaloneTracks) {
    const fragments = await getFragmentsByTrack(track.id);
    const fragmentsWithTakes = [];
    const orphanTakes = await getTakesByTrack(track.id);

    for (const fragment of fragments) {
      const takes = await getTakesByFragment(fragment.id);
      fragmentsWithTakes.push({
        ...fragment,
        takes: takes.sort((a, b) => a.createdAt - b.createdAt),
      });
    }

    result.push({
      type: 'track',
      ...track,
      fragments: fragmentsWithTakes,
      orphanTakes: orphanTakes.sort((a, b) => a.createdAt - b.createdAt),
    });
  }

  return result;
};

// Salva/recupera sessione corrente (localStorage per persistenza semplice)
// Sessione: { authorId?, authorName?, operaId?, operaName?, trackId, trackName, fragmentId?, fragmentName? }
export const saveCurrentSession = async (session) => {
  localStorage.setItem('currentSession', JSON.stringify(session));
  // Salva anche nella cronologia
  await addToSessionHistory(session);
};

export const getCurrentSession = () => {
  const session = localStorage.getItem('currentSession');
  return session ? JSON.parse(session) : null;
};

export const clearCurrentSession = () => {
  localStorage.removeItem('currentSession');
};

// ============================================
// SESSION HISTORY (Sessioni recenti)
// ============================================

// Genera chiave unica per la sessione
const generateSessionKey = (session) => {
  return `${session.authorId || ''}_${session.operaId || ''}_${session.trackId}_${session.fragmentId || ''}`;
};

// Aggiunge o aggiorna una sessione nella cronologia
export const addToSessionHistory = async (session) => {
  const db = await initDB();
  const sessionKey = generateSessionKey(session);

  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessionHistory', 'readwrite');
    const store = tx.objectStore('sessionHistory');
    const index = store.index('sessionKey');

    // Cerca se la sessione esiste già
    const getRequest = index.get(sessionKey);
    getRequest.onsuccess = () => {
      const existing = getRequest.result;
      const historyEntry = {
        id: existing?.id || generateId(),
        sessionKey,
        session,
        lastUsed: Date.now(),
        useCount: (existing?.useCount || 0) + 1,
      };
      store.put(historyEntry);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

// Ottieni sessioni recenti con paginazione (lazy loading)
export const getRecentSessions = async (limit = 20, offset = 0) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sessionHistory', 'readonly');
    const store = tx.objectStore('sessionHistory');
    const index = store.index('lastUsed');
    const results = [];
    let skipped = 0;
    let collected = 0;

    const request = index.openCursor(null, 'prev'); // Più recenti prima

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor && collected < limit) {
        if (skipped >= offset) {
          results.push(cursor.value);
          collected++;
        } else {
          skipped++;
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

// Cerca sessioni per nome
export const searchRecentSessions = async (query) => {
  const allHistory = await getRecentSessions(100, 0);
  const lowerQuery = query.toLowerCase();

  return allHistory.filter(entry => {
    const s = entry.session;
    return (
      (s.authorName?.toLowerCase().includes(lowerQuery)) ||
      (s.operaName?.toLowerCase().includes(lowerQuery)) ||
      (s.trackName?.toLowerCase().includes(lowerQuery)) ||
      (s.fragmentName?.toLowerCase().includes(lowerQuery))
    );
  });
};
