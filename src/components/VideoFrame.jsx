import { useRef } from 'react';
import useGlitchEffect from './video-frame/useGlitchEffect';
import VideoOverlay from './video-frame/VideoOverlay';
import './VideoFrame.css';

export default function VideoFrame() {
  const frameRef = useRef(null);

  useGlitchEffect({ frameRef, duration: 500, intervalMs: 2000, chance: 0.85 });

  return (
    <div className="video-frame" ref={frameRef} id="mainFrame">
      <div className="video-content">
        <VideoOverlay />
        <img
          src="public\npcs\LightFinger.png"
          alt="Hands"
          className="character-img"
        />
      </div>
    </div>
  );
}
