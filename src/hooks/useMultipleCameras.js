import { useState, useEffect, useCallback } from 'react';

export function useMultipleCameras() {
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const checkCameras = useCallback(async () => {
    try {
      setIsLoading(true);

      // Richiedi prima il permesso per la camera
      // Questo è necessario per ottenere i label dei dispositivi
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Chiudi subito lo stream, serve solo per ottenere il permesso
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError) {
        console.log('Permesso camera non concesso:', permissionError);
        setHasMultipleCameras(false);
        setCameras([]);
        setIsLoading(false);
        return;
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      setCameras(videoDevices);
      setHasMultipleCameras(videoDevices.length > 1);

    } catch (error) {
      console.error('Errore nel controllare le telecamere:', error);
      setHasMultipleCameras(false);
      setCameras([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkCameras();

    // Ascolta cambiamenti nei dispositivi (es. collegamento/scollegamento USB)
    const handleDeviceChange = () => {
      checkCameras();
    };

    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [checkCameras]);

  return {
    hasMultipleCameras,
    cameras,
    isLoading,
    refreshCameras: checkCameras
  };
}
