import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  value: string;
  size?: number;
  avatar?: string;
  className?: string;
}

export default function QRCodeGenerator({ 
  value, 
  size = 256, 
  avatar, 
  className = '' 
}: QRCodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!value || !canvasRef.current) return;

    generateQRCode();
  }, [value, size, avatar]);

  const generateQRCode = async () => {
    if (!canvasRef.current) return;
    
    setIsGenerating(true);
    
    try {
      // Generate base QR code
      await QRCode.toCanvas(canvasRef.current, value, {
        width: size,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add avatar overlay if provided
      if (avatar) {
        await addAvatarOverlay();
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const addAvatarOverlay = async () => {
    if (!canvasRef.current || !avatar) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Create avatar image
      const avatarImg = new Image();
      avatarImg.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        avatarImg.onload = resolve;
        avatarImg.onerror = reject;
        avatarImg.src = avatar;
      });

      // Calculate overlay size and position
      const overlaySize = size * 0.375; // 37.5% of QR code size (25% bigger than before)
      const borderWidth = 5; // 5px white border
      const x = (size - overlaySize) / 2;
      const y = (size - overlaySize) / 2;

      // Draw white border circle (larger)
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + overlaySize / 2, y + overlaySize / 2, overlaySize / 2, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();

      // Create circular clipping path for avatar (smaller to leave border)
      const avatarSize = overlaySize - (borderWidth * 2);
      const avatarX = x + borderWidth;
      const avatarY = y + borderWidth;

      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI);
      ctx.clip();

      // Calculate source dimensions to maintain aspect ratio
      // Force the height and crop width as needed
      const imgAspectRatio = avatarImg.width / avatarImg.height;
      const targetAspectRatio = 1; // We want a square display area
      
      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = avatarImg.width;
      let sourceHeight = avatarImg.height;
      
      if (imgAspectRatio > targetAspectRatio) {
        // Image is wider than target - crop width (keep full height)
        sourceHeight = avatarImg.height;
        sourceWidth = avatarImg.height * targetAspectRatio;
        sourceX = (avatarImg.width - sourceWidth) / 2;
        sourceY = 0;
      } else {
        // Image is taller than target - crop height (keep full width)
        sourceWidth = avatarImg.width;
        sourceHeight = avatarImg.width / targetAspectRatio;
        sourceX = 0;
        sourceY = (avatarImg.height - sourceHeight) / 2;
      }

      // Draw avatar with proper cropping
      ctx.drawImage(
        avatarImg,
        sourceX, sourceY, sourceWidth, sourceHeight, // Source rectangle
        avatarX, avatarY, avatarSize, avatarSize      // Destination rectangle
      );
      
      ctx.restore();
    } catch (error) {
      console.error('Error adding avatar overlay:', error);
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        <canvas
          ref={canvasRef}
          className={`border border-gray-200 rounded-lg ${isGenerating ? 'opacity-50' : ''}`}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    </div>
  );
} 