import { CALLER_NAME, INCOMING_TITLE } from '../constants/ui';
import IncomingStatus from './incoming-call/IncomingStatus';
import './IncomingCall.css';

export default function IncomingCall({ onAnswer }) {
  return (
    <div className="incoming-screen">
      <div className="incoming-title">{INCOMING_TITLE}</div>
      <div className="incoming-name">{CALLER_NAME}</div>
      <IncomingStatus />
      <button className="answer-btn" onClick={onAnswer}>ATENDER</button>
    </div>
  );
}
