import React from "react";

const VoiceInput = ({ isListening, disabled, onClick }) => {
  return (
    <button
      type="button"
      className={`voice-input-button ${isListening ? "listening" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={isListening ? "Stop voice recognition" : "Start voice recognition"}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    </button>
  );
};

export default VoiceInput;
