import { useState } from 'react';
import Sidebar from './Sidebar';
import VideoFrame from './VideoFrame';
import MessagePanel from './MessagePanel';
import Controls from './Controls';
import CallHeader from './call-screen/CallHeader';
import MainLayout from './call-screen/MainLayout';
import './CallScreen.css';

export default function CallScreen({
  onExit,
  showMissionDecision,
  onAcceptMission,
  onDenyMission,
  onNarrationStart,
  callEventData,
}) {
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
            <CallHeader connectionCode={callEventData?.connectionCode} callerName={callEventData?.callerName} />
            <VideoFrame imageUrl={callEventData?.avatarUrl} />
            <Controls
              onToggleMessage={toggleMessage}
              showMessage={showMessage}
              onNarrationStart={onNarrationStart}
              narrationUrl={callEventData?.audioUrl}
            />
            {showMissionDecision ? (
              <div className="mission-decision-box">
                <button className="mission-decision-btn accept" onClick={onAcceptMission}>ACEITAR MISSAO</button>
                <button className="mission-decision-btn deny" onClick={onDenyMission}>NEGAR MISSAO</button>
              </div>
            ) : null}
          </div>
        )}
        messagePanel={(
          <MessagePanel
            messageText={callEventData?.messageText}
            messageSender={callEventData?.messageSender}
            messageTimestamp={callEventData?.messageTimestamp}
          />
        )}
      />
    </div>
  );
}
