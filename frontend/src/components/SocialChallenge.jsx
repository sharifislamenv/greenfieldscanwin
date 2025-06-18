//D:\MyProjects\greenfield-scanwin\frontend\src\components\SocialChallenge.jsx
import React, { useState } from 'react';
import { 
  FacebookShareButton, FacebookIcon,
  TwitterShareButton, TwitterIcon,
  WhatsappShareButton, WhatsappIcon,
  LinkedinShareButton, LinkedinIcon
} from 'react-share';
import { supabase } from '../supabaseClient';
import './SocialChallenge.css';

// Custom Instagram Icon Component
const InstagramIcon = ({ size, round }) => (
  <div className="instagram-icon" style={{
    width: size,
    height: size,
    borderRadius: round ? '50%' : 0,
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  </div>
);

// Custom TikTok Icon Component
const TikTokIcon = ({ size, round }) => (
  <div className="tiktok-icon" style={{
    width: size,
    height: size,
    borderRadius: round ? '50%' : 0,
  }}>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#fff">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-.99.1-2.02.13-3.03.06-3.15.09-6.3.03-9.45v-.01z"/>
    </svg>
  </div>
);

const SocialChallenge = ({ campaign, onComplete }) => {
  const [shared, setShared] = useState(false);
  const [platform, setPlatform] = useState('');
  
  const handleShare = async (platformName) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return;
      }
      
      const { error } = await supabase.from('social_shares').insert({
        user_id: user.id,
        platform: platformName,
        content: campaign ? `#${campaign.name.replace(/\s+/g, '')}` : '#GreenfieldLights',
        points_earned: 50
      });
      
      if (error) throw error;
      
      setPlatform(platformName);
      setShared(true);
      onComplete();
    } catch (error) {
      console.error('Error recording social share:', error);
    }
  };

  const handleInstagramShare = () => {
    const text = encodeURIComponent(
      `Just unlocked Greenfield rewards! ${campaign ? `Join the ${campaign.name} challenge!` : ''} #GreenfieldLights`
    );
    window.open(`https://www.instagram.com/create/story?text=${text}`, '_blank');
    handleShare('instagram');
  };

  const handleTikTokShare = () => {
    const text = encodeURIComponent(
      `Greenfield Challenge Unlocked! ${campaign ? campaign.name : 'Scan & Win'} #GreenfieldLights`
    );
    window.open(`https://www.tiktok.com/upload?lang=en&referer=share&share_info=${text}`, '_blank');
    handleShare('tiktok');
  };

  return (
    <div className="social-challenge">
      <h2>Level 3: Social Challenge</h2>
      <p>Share your experience to unlock special rewards</p>
      
      {campaign && (
        <div className="campaign-prompt">
          <h3>{campaign.name}</h3>
          <p>{campaign.description}</p>
          <p>Use hashtag: <strong>#{campaign.name.replace(/\s+/g, '')}</strong></p>
        </div>
      )}
      
      <div className="social-buttons">
        <FacebookShareButton
          url={window.location.href}
          quote="Just unlocked exclusive Greenfield rewards! #GreenfieldLights"
          hashtag="#GreenfieldLights"
          beforeOnClick={() => handleShare('facebook')}
        >
          <FacebookIcon size={64} round />
        </FacebookShareButton>
        
        <TwitterShareButton
          url={window.location.href}
          title="Just unlocked Greenfield rewards! #GreenfieldLights"
          beforeOnClick={() => handleShare('twitter')}
        >
          <TwitterIcon size={64} round />
        </TwitterShareButton>
        
        <WhatsappShareButton
          url={window.location.href}
          title="Check out Greenfield rewards!"
          beforeOnClick={() => handleShare('whatsapp')}
        >
          <WhatsappIcon size={64} round />
        </WhatsappShareButton>
        
        <LinkedinShareButton
          url={window.location.href}
          title="Greenfield Challenge"
          summary="Just completed a Greenfield Scan & Win challenge!"
          beforeOnClick={() => handleShare('linkedin')}
        >
          <LinkedinIcon size={64} round />
        </LinkedinShareButton>
        
        <button 
          className="social-custom-button"
          onClick={handleInstagramShare}
        >
          <InstagramIcon size={64} round />
          <span>Instagram</span>
        </button>
        
        <button 
          className="social-custom-button"
          onClick={handleTikTokShare}
        >
          <TikTokIcon size={64} round />
          <span>TikTok</span>
        </button>
      </div>
      
      {shared && (
        <div className="success-message">
          <p>Successfully shared on {platform}! Points added to your account.</p>
        </div>
      )}
    </div>
  );
};

export default SocialChallenge;