import type { ImgHTMLAttributes, SVGProps } from 'react';

type MangaDetailIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

type MangaDetail3DIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'height' | 'src' | 'width'> & {
  size?: number | string;
};

export const MANGAMUKAI_COIN_3D_ICON = 'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/3d-coin-dynamic-color.png';
const BOOK_3D_ICON = 'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/gradient/notebook-dynamic-gradient.png';
const OPEN_BOOK_3D_ICON = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Open%20book/3D/open_book_3d.png';
const SHOPPING_CART_3D_ICON = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Shopping%20cart/3D/shopping_cart_3d.png';
const TICKET_3D_ICON = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Admission%20tickets/3D/admission_tickets_3d.png';

const iconProps = (size: number | string) => ({
  'aria-hidden': true,
  focusable: false,
  height: size,
  viewBox: '0 0 256 256',
  width: size,
});

// Raster assets from 3Dicons (CC0-1.0): https://github.com/realvjy/3dicons
export function DetailCoin3DIcon({ size = 28, ...props }: MangaDetail3DIconProps) {
  return (
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
}

export function DetailBook3DIcon({ size = 28, ...props }: MangaDetail3DIconProps) {
  return (
    <img
      {...props}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      height={size}
      src={BOOK_3D_ICON}
      width={size}
    />
  );
}

// Open-book asset from Microsoft Fluent Emoji (MIT):
// https://github.com/microsoft/fluentui-emoji
export function DetailOpenBook3DIcon({ size = 28, ...props }: MangaDetail3DIconProps) {
  return (
    <img
      {...props}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      height={size}
      src={OPEN_BOOK_3D_ICON}
      width={size}
    />
  );
}

export function DetailShoppingCart3DIcon({ size = 28, ...props }: MangaDetail3DIconProps) {
  return (
    <img
      {...props}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      height={size}
      src={SHOPPING_CART_3D_ICON}
      width={size}
    />
  );
}

// Ticket asset from Microsoft Fluent Emoji (MIT):
// https://github.com/microsoft/fluentui-emoji
export function DetailTicket3DIcon({ size = 28, ...props }: MangaDetail3DIconProps) {
  return (
    <img
      {...props}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      height={size}
      src={TICKET_3D_ICON}
      width={size}
    />
  );
}

// SVG geometry sourced from Phosphor Icons Core, Iconoir and Font Awesome Free
// (Font Awesome SVG icon licensed under CC BY 4.0):
// https://github.com/phosphor-icons/core/tree/main/assets/duotone
// https://github.com/iconoir-icons/iconoir/tree/main/icons/regular
// https://github.com/FortAwesome/Font-Awesome/blob/6.x/svgs/solid/dna.svg
export function DetailCalendarIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} fill="currentColor" {...props}>
      <path d="M216,48V88H40V48a8,8,0,0,1,8-8H208A8,8,0,0,1,216,48Z" opacity="0.2" />
      <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Zm-68-76a12,12,0,1,1-12-12A12,12,0,0,1,140,132Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,132ZM96,172a12,12,0,1,1-12-12A12,12,0,0,1,96,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,140,172Zm44,0a12,12,0,1,1-12-12A12,12,0,0,1,184,172Z" />
    </svg>
  );
}

export function DetailStudioIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} fill="currentColor" {...props}>
      <path d="M136,32V216H40V85.35a8,8,0,0,1,3.56-6.66l80-53.33A8,8,0,0,1,136,32Z" opacity="0.2" />
      <path d="M240,208H224V96a16,16,0,0,0-16-16H144V32a16,16,0,0,0-24.88-13.32L39.12,72A16,16,0,0,0,32,85.34V208H16a8,8,0,0,0,0,16H240a8,8,0,0,0,0-16ZM208,96V208H144V96ZM48,85.34,128,32V208H48ZM112,112v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm-32,0v16a8,8,0,0,1-16,0V112a8,8,0,1,1,16,0Zm0,56v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Zm32,0v16a8,8,0,0,1-16,0V168a8,8,0,0,1,16,0Z" />
    </svg>
  );
}

export function DetailPlatformIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} fill="currentColor" {...props}>
      <path d="M200,64V80H176a16,16,0,0,0-16,16v80H40a16,16,0,0,1-16-16V64A16,16,0,0,1,40,48H184A16,16,0,0,1,200,64Z" opacity="0.2" />
      <path d="M224,72H208V64a24,24,0,0,0-24-24H40A24,24,0,0,0,16,64v96a24,24,0,0,0,24,24H152v8a24,24,0,0,0,24,24h48a24,24,0,0,0,24-24V96A24,24,0,0,0,224,72ZM40,168a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H184a8,8,0,0,1,8,8v8H176a24,24,0,0,0-24,24v72Zm192,24a8,8,0,0,1-8,8H176a8,8,0,0,1-8-8V96a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8Zm-96,16a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h40A8,8,0,0,1,136,208Zm80-96a8,8,0,0,1-8,8H192a8,8,0,0,1,0-16h16A8,8,0,0,1,216,112Z" />
    </svg>
  );
}

export function DetailPublicationIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} fill="currentColor" {...props}>
      <path d="M216,48H40a8,8,0,0,0-8,8V216l32-16,32,16,32-16,32,16,32-16,32,16V56A8,8,0,0,0,216,48ZM112,160H64V96h48Z" opacity="0.2" />
      <path d="M216,40H40A16,16,0,0,0,24,56V216a8,8,0,0,0,11.58,7.15L64,208.94l28.42,14.21a8,8,0,0,0,7.16,0L128,208.94l28.42,14.21a8,8,0,0,0,7.16,0L192,208.94l28.42,14.21A8,8,0,0,0,232,216V56A16,16,0,0,0,216,40Zm0,163.06-20.42-10.22a8,8,0,0,0-7.16,0L160,207.06l-28.42-14.22a8,8,0,0,0-7.16,0L96,207.06,67.58,192.84a8,8,0,0,0-7.16,0L40,203.06V56H216ZM136,112a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H144A8,8,0,0,1,136,112Zm0,32a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H144A8,8,0,0,1,136,144ZM64,168h48a8,8,0,0,0,8-8V96a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8v64A8,8,0,0,0,64,168Zm8-64h32v48H72Z" />
    </svg>
  );
}

export function DetailCollectionIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M5 19.5V5C5 3.89543 5.89543 3 7 3H18.4C18.7314 3 19 3.26863 19 3.6V21" />
      <path d="M9 7L15 7" />
      <path d="M6.5 15L19 15" />
      <path d="M6.5 18L19 18" />
      <path d="M6.5 21L19 21" />
      <path d="M6.5 18C5.5 18 5 17.3284 5 16.5C5 15.6716 5.5 15 6.5 15" />
      <path d="M6.5 21C5.5 21 5 20.3284 5 19.5C5 18.6716 5.5 18 6.5 18" />
    </svg>
  );
}

export function DetailReadIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} fill="currentColor" {...props}>
      <path d="M232,56V200H160a32,32,0,0,0-32,32V88a32,32,0,0,1,32-32Z" opacity="0.2" />
      <path d="M232,48H160a40,40,0,0,0-32,16A40,40,0,0,0,96,48H24a8,8,0,0,0-8,8V200a8,8,0,0,0,8,8H96a24,24,0,0,1,24,24,8,8,0,0,0,16,0,24,24,0,0,1,24-24h72a8,8,0,0,0,8-8V56A8,8,0,0,0,232,48ZM96,192H32V64H96a24,24,0,0,1,24,24V200A39.81,39.81,0,0,0,96,192Zm128,0H160a39.81,39.81,0,0,0-24,8V88a24,24,0,0,1,24-24h64ZM160,88h40a8,8,0,0,1,0,16H160a8,8,0,0,1,0-16Zm48,40a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,128Zm0,32a8,8,0,0,1-8,8H160a8,8,0,0,1,0-16h40A8,8,0,0,1,208,160Z" />
    </svg>
  );
}

export function DetailCoinsIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 14c0 1.657 2.686 3 6 3s6 -1.343 6 -3s-2.686 -3 -6 -3s-6 1.343 -6 3" />
      <path d="M9 14v4c0 1.656 2.686 3 6 3s6 -1.344 6 -3v-4" />
      <path d="M3 6c0 1.072 1.144 2.062 3 2.598s4.144 .536 6 0c1.856 -.536 3 -1.526 3 -2.598c0 -1.072 -1.144 -2.062 -3 -2.598s-4.144 -.536 -6 0c-1.856 .536 -3 1.526 -3 2.598" />
      <path d="M3 6v10c0 .888 .772 1.45 2 2" />
      <path d="M3 11c0 .888 .772 1.45 2 2" />
    </svg>
  );
}

export function DetailPurchasedIcon({ size = 28, ...props }: MangaDetailIconProps) {
  return (
    <svg {...iconProps(size)} viewBox="-116 -84 680 680" fill="currentColor" {...props}>
      <path
        transform="rotate(-45 224 256)"
        d="M416 0c17.7 0 32 14.3 32 32c0 59.8-30.3 107.5-69.4 146.6c-28 28-62.5 53.5-97.3 77.4l-2.5 1.7c-11.9 8.1-23.8 16.1-35.5 23.9l-1.6 1c-6 4-11.9 7.9-17.8 11.9c-20.9 14-40.8 27.7-59.3 41.5h118.5c-9.8-7.4-20.1-14.7-30.7-22.1l10-6.7c15.1-10.1 30.9-20.6 46.7-31.6c25 18.1 48.9 37.3 69.4 57.7C417.7 372.5 448 420.2 448 480c0 17.7-14.3 32-32 32s-32-14.3-32-32H64c0 17.7-14.3 32-32 32S0 497.7 0 480c0-59.8 30.3-107.5 69.4-146.6c28-28 62.5-53.5 97.3-77.4c-34.8-23.9-69.3-49.3-97.3-77.4C30.3 139.5 0 91.8 0 32C0 14.3 14.3 0 32 0s32 14.3 32 32h320c0-17.7 14.3-32 32-32zM338.6 384H109.4c-10.1 10.6-18.6 21.3-25.5 32h280.2c-6.8-10.7-15.3-21.4-25.5-32zM109.4 128h229.2c10.1-10.7 18.6-21.3 25.5-32H83.9c6.8 10.7 15.3 21.3 25.5 32zm55.4 48c18.4 13.8 38.4 27.5 59.3 41.5c20.9-14 40.8-27.7 59.3-41.5H164.8z"
      />
    </svg>
  );
}
