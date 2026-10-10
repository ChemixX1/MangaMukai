import type { ImgHTMLAttributes } from 'react';

type CoinIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'height' | 'src' | 'width'> & {
  size?: number | string;
};

// Moneda 3D de 3Dicons (CC0-1.0): https://github.com/realvjy/3dicons
export const MANGAMUKAI_COIN_3D_ICON = 'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/3d-coin-dynamic-color.png';

/** Moneda de MangaMukai (precio de los capítulos, saldo del navbar, compras). */
export const DetailCoin3DIcon = ({ size = 28, ...props }: CoinIconProps) => (
  <img
    {...props}
    alt=""
    aria-hidden="true"
    decoding="async"
    draggable={false}
    height={size}
    src={MANGAMUKAI_COIN_3D_ICON}
    width={size}
  />
);
