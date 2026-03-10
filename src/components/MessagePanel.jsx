import { MESSAGE_TEXT } from '../constants/ui';
import MessageMeta from './message-panel/MessageMeta';
import useTypewriter from './message-panel/useTypewriter';
import './MessagePanel.css';

export default function MessagePanel({
  messageText = MESSAGE_TEXT,
  messageSender = undefined,
  messageTimestamp = undefined,
}) {
  const messageRef = useTypewriter({ text: messageText, speed: 50 });

  return (
    <div className="message-panel">
      <div className="message-content">
        <MessageMeta type="sender" text={messageSender} />
        <div className="message-text" ref={messageRef}></div>
        <MessageMeta type="timestamp" text={messageTimestamp} />
      </div>
    </div>
  );
}
