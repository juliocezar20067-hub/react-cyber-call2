import { CALLER_NAME, INCOMING_TITLE } from '../constants/ui';
import IncomingStatus from './incoming-call/IncomingStatus';
import './IncomingCall.css';

export default function IncomingCall({ onAnswer, callerName = CALLER_NAME, statusText }) {
  return (
    <div className="incoming-screen">
      <div className="incoming-title">{INCOMING_TITLE}</div>
      <div className="incoming-name">{callerName}</div>
      <IncomingStatus statusText={statusText} />
      <button className="answer-btn" onClick={onAnswer}>ATENDER</button>
    </div>
  );
}
