export default function MainLayout({ showMessage, sidebar, callContainer, messagePanel }) {
  return (
    <div className={`main-layout ${showMessage ? 'show-message' : ''}`}>
      {sidebar}
      {callContainer}
      {showMessage ? messagePanel : null}
    </div>
  );
}
