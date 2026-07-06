import React from 'react';
import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  /** Visual size of the ring. Default: 'md' */
  size?: 'sm' | 'md' | 'lg';
  /** Optional loading message (animated dots appended automatically) */
  text?: string;
  /**
   * When true, renders a full-screen backdrop + centered card.
   * When false (default), renders centered inline within the parent container.
   */
  overlay?: boolean;
  /** Extra class on the outermost element */
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  overlay = false,
  className,
}) => {
  const ring = <div className="ls-ring" data-size={size} />;

  const inner = (
    <>
      {ring}
      {text && <p className="ls-text">{text}</p>}
    </>
  );

  if (overlay) {
    return (
      <div className={`ls-overlay${className ? ` ${className}` : ''}`}>
        <div className="ls-card">{inner}</div>
      </div>
    );
  }

  return (
    <div className={`ls-inline${className ? ` ${className}` : ''}`}>
      {inner}
    </div>
  );
};

export default LoadingSpinner;
