//D:\MyProjects\greenfield-scanwin\frontend\src\components\VideoExperience.jsx
import React, { useState, useEffect } from 'react';

const VideoExperience = ({ videoId, onComplete }) => {
  const [videoProgress, setVideoProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Simulate video progress
  useEffect(() => {
    if (completed) return;
    
    const interval = setInterval(() => {
      setVideoProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          setCompleted(true);
          clearInterval(interval);
        }
        return newProgress;
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, [completed]);

  return (
    <div className="video-experience">
      <h2>Brand Story Experience</h2>
      <p>Watch this exclusive content to unlock your reward</p>
      
      <div className="video-container">
        {/* Placeholder for video player */}
        <div className="video-placeholder">
          <div className="video-progress" style={{ width: `${videoProgress}%` }}></div>
          <div className="video-overlay">
            {completed ? '✓ Video Completed' : 'Playing Brand Story...'}
          </div>
        </div>
      </div>
      
      <div className="progress-container">
        <div className="progress-bar" style={{ width: `${videoProgress}%` }}></div>
      </div>
      
      <button 
        className="complete-button"
        onClick={onComplete}
        disabled={!completed}
      >
        {completed ? 'Continue to Reward' : 'Please watch the video...'}
      </button>
    </div>
  );
};

export default VideoExperience;