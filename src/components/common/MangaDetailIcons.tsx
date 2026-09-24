import type { ImgHTMLAttributes } from 'react';

type Raster3DIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'height' | 'src' | 'width'> & {
  size?: number | string;
};

// Moneda de 3Dicons (CC0-1.0): https://github.com/realvjy/3dicons
export const MANGAMUKAI_COIN_3D_ICON = 'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/3d-coin-dynamic-color.png';
// Entrada de Microsoft Fluent Emoji (MIT): https://github.com/microsoft/fluentui-emoji
const TICKET_3D_ICON = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Admission%20tickets/3D/admission_tickets_3d.png';

const Raster3DIcon = ({ size = 28, src, ...props }: Raster3DIconProps & { src: string }) => (
  <img
    {...props}
    alt=""
    aria-hidden="true"
    decoding="async"
    draggable={false}
    height={size}
    src={src}
    width={size}
  />
);

export const DetailCoin3DIcon = (props: Raster3DIconProps) => <Raster3DIcon {...props} src={MANGAMUKAI_COIN_3D_ICON} />;

export const DetailTicket3DIcon = (props: Raster3DIconProps) => <Raster3DIcon {...props} src={TICKET_3D_ICON} />;
