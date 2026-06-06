'use client';

import { useRef, useEffect } from 'react';
import QRCode from 'qrcode';

export interface QRCanvasProps {
  value: string;
  size?: number;
  color?: string;
  bg?: string;
  logo?: string;
  radius?: number;
  padding?: number;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export const QRCanvas = ({ value, size = 200, color = '#0A0B14', bg = '#FFFFFF', logo, radius = 12 }: QRCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    const canvas = ref.current;
    QRCode.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: { dark: color, light: bg },
      errorCorrectionLevel: 'M',
    }).then(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx || radius <= 0) return;
      const img = new Image();
      img.src = canvas.toDataURL();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        roundRect(ctx, 0, 0, canvas.width, canvas.height, radius * (canvas.width / size));
        ctx.clip();
        ctx.drawImage(img, 0, 0);
      };
    }).catch(() => {});
  }, [value, size, color, bg, radius, logo]);

  return (
    <div className="lp-qr-wrap" style={{ width: size, height: size }}>
      <canvas ref={ref}/>
      {logo && <div className="lp-qr-logo" style={{ background: color, color: bg }}>{logo}</div>}
    </div>
  );
};
