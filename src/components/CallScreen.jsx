import { useState } from 'react';
import Sidebar from './Sidebar';
import VideoFrame from './VideoFrame';
import MessagePanel from './MessagePanel';
import Controls from './Controls';
import CallHeader from './call-screen/CallHeader';
import MainLayout from './call-screen/MainLayout';
import './CallScreen.css';

export default function CallScreen({ onExit }) {
  const [showMessage, setShowMessage] = useState(false);

  const toggleMessage = () => {
    setShowMessage((prev) => !prev);
  };

  return (
    <div className="call-screen">
      <MainLayout
        showMessage={showMessage}
        sidebar={<Sidebar />}
        callContainer={(
          <div className="call-container">
            <div className="call-screen-top-actions">
              <button className="exit-call-btn" onClick={onExit}>SAIR DA LIGACAO</button>
            </div>
            <CallHeader />
            <VideoFrame />
            <Controls onToggleMessage={toggleMessage} showMessage={showMessage} />
          </div>
        )}
        messagePanel={<MessagePanel />}
      />
    </div>
  );
}
