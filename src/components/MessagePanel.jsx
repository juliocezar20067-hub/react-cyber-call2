import { MESSAGE_TEXT } from '../constants/ui';
import MessageMeta from './message-panel/MessageMeta';
import useTypewriter from './message-panel/useTypewriter';
import './MessagePanel.css';

export default function MessagePanel() {
  const messageRef = useTypewriter({ text: MESSAGE_TEXT, speed: 50 });

  return (
    <div className="message-panel">
      <div className="message-content">
        <MessageMeta type="sender" />
        <div className="message-text" ref={messageRef}></div>
        <MessageMeta type="timestamp" />
      </div>
    </div>
  );
}
