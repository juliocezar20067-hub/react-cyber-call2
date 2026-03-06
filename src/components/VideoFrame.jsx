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
          src="https://image2url.com/r2/default/images/1772824379564-be375f73-73b3-4e07-81f9-a0fc9851a25a.png"
          alt="Hands"
          className="character-img"
        />
      </div>
    </div>
  );
}
