import { useState, useEffect, useMemo } from 'react';

interface TextTypeProps {
  text?: string[];
  texts?: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  variableSpeedEnabled?: boolean;
  variableSpeedMin?: number;
  variableSpeedMax?: number;
  cursorBlinkDuration?: number;
  className?: string;
}

export default function TextType({
  text,
  texts,
  typingSpeed = 75,
  deletingSpeed = 50,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "_",
  variableSpeedEnabled = false,
  variableSpeedMin = 60,
  variableSpeedMax = 120,
  cursorBlinkDuration = 0.5,
  className = ""
}: TextTypeProps) {
  const stringifiedStrings = JSON.stringify(text || texts || []);
  const strings = useMemo(() => JSON.parse(stringifiedStrings), [stringifiedStrings]);
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (strings.length === 0) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const currentFullText = strings[currentStringIndex];

    const getTypingSpeed = () => {
      if (variableSpeedEnabled) {
        return Math.floor(Math.random() * (variableSpeedMax - variableSpeedMin + 1)) + variableSpeedMin;
      }
      return typingSpeed;
    };

    if (isDeleting) {
      if (currentText === "") {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % strings.length);
      } else {
        timeoutId = setTimeout(() => {
          setCurrentText(currentFullText.substring(0, currentText.length - 1));
        }, deletingSpeed);
      }
    } else {
      if (currentText === currentFullText) {
        if (strings.length > 1) {
            timeoutId = setTimeout(() => {
            setIsDeleting(true);
            }, pauseDuration);
        }
      } else {
        timeoutId = setTimeout(() => {
          setCurrentText(currentFullText.substring(0, currentText.length + 1));
        }, getTypingSpeed());
      }
    }

    return () => clearTimeout(timeoutId);
  }, [currentText, isDeleting, currentStringIndex, strings, typingSpeed, deletingSpeed, pauseDuration, variableSpeedEnabled, variableSpeedMin, variableSpeedMax]);

  return (
    <span className={`inline-flex items-center ${className}`}>
      <span>{currentText}</span>
      {showCursor && (
        <span 
            style={{ animation: `text-type-cursor-blink ${cursorBlinkDuration}s step-end infinite` }}
            className="inline-block"
        >
          {cursorCharacter}
        </span>
      )}
      <style>{`
        @keyframes text-type-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </span>
  );
}
