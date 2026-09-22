interface IconProps {
  size?: number;
  className?: string;
}

/** Llama naranja del título "Inicia un Nuevo Chat". */
export const FlameIcon = ({ size = 26, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 26 26" fill="none" aria-hidden="true" className={className}>
    <path d="M13 26C18.3852 26 22.75 22.75 22.75 17.0625C22.75 14.625 21.9375 10.5625 18.6875 7.3125C19.0938 9.75 16.6562 10.5625 16.6562 10.5625C17.875 6.5 14.625 0.8125 9.75 0C10.3301 3.25 10.5625 6.5 6.5 9.75C4.46875 11.375 3.25 14.1846 3.25 17.0625C3.25 22.75 7.61475 26 13 26ZM13 24.375C10.3074 24.375 8.125 22.75 8.125 19.9062C8.125 18.6875 8.53125 16.6562 10.1562 15.0312C9.95312 16.25 11.375 17.0625 11.375 17.0625C10.7656 15.0312 12.1875 11.7812 14.625 11.375C14.3341 13 14.2188 14.625 16.25 16.25C17.2656 17.0625 17.875 18.4665 17.875 19.9062C17.875 22.75 15.6926 24.375 13 24.375Z" fill="#FB5937" />
  </svg>
);

/** Pila de monedas del saldo. */
export const CoinStackIcon = ({ size = 33, className }: IconProps) => (
  <svg width={size} height={Math.round((size * 31) / 33)} viewBox="0 0 33 31" fill="none" aria-hidden="true" className={className}>
    <path d="M16.5 28.7857C22.3575 28.7857 27.1071 26.5548 27.1071 23.8036V20.4821H5.89285V23.8036C5.89285 26.5548 10.6425 28.7857 16.5 28.7857Z" fill="url(#mcc-coin-0)" />
    <path d="M16.5 25.4643C22.3582 25.4643 27.1071 23.2337 27.1071 20.4821C27.1071 17.7306 22.3582 15.5 16.5 15.5C10.6418 15.5 5.89285 17.7306 5.89285 20.4821C5.89285 23.2337 10.6418 25.4643 16.5 25.4643Z" fill="url(#mcc-coin-1)" />
    <path d="M12.9643 22.6964C18.8218 22.6964 23.5714 20.4655 23.5714 17.7143V14.3929H2.35714V17.7143C2.35714 20.4655 7.10678 22.6964 12.9643 22.6964Z" fill="url(#mcc-coin-2)" />
    <path d="M12.9643 18.8214C18.8224 18.8214 23.5714 16.5909 23.5714 13.8393C23.5714 11.0877 18.8224 8.85715 12.9643 8.85715C7.10612 8.85715 2.35714 11.0877 2.35714 13.8393C2.35714 16.5909 7.10612 18.8214 12.9643 18.8214Z" fill="url(#mcc-coin-3)" />
    <path d="M17.6786 14.9464C23.5361 14.9464 28.2857 12.7155 28.2857 9.96429V6.64286H7.07143V9.96429C7.07143 12.7155 11.8211 14.9464 17.6786 14.9464Z" fill="url(#mcc-coin-4)" />
    <path d="M17.6786 12.1786C23.5367 12.1786 28.2857 9.94799 28.2857 7.19643C28.2857 4.44487 23.5367 2.21429 17.6786 2.21429C11.8204 2.21429 7.07143 4.44487 7.07143 7.19643C7.07143 9.94799 11.8204 12.1786 17.6786 12.1786Z" fill="url(#mcc-coin-5)" />
    <defs>
      <linearGradient id="mcc-coin-0" x1="11.5194" y1="22.5193" x2="14.2797" y2="29.5792" gradientUnits="userSpaceOnUse"><stop stopColor="#FFA43D" /><stop offset="1" stopColor="#FB5937" /></linearGradient>
      <linearGradient id="mcc-coin-1" x1="27.1378" y1="25.461" x2="18.7984" y2="10.937" gradientUnits="userSpaceOnUse"><stop stopColor="#FF8A69" /><stop offset="1" stopColor="#FFCD0F" /></linearGradient>
      <linearGradient id="mcc-coin-2" x1="7.98364" y1="16.4311" x2="10.744" y2="23.4899" gradientUnits="userSpaceOnUse"><stop stopColor="#FFA43D" /><stop offset="1" stopColor="#FB5937" /></linearGradient>
      <linearGradient id="mcc-coin-3" x1="23.6021" y1="18.8181" x2="15.2626" y2="4.29419" gradientUnits="userSpaceOnUse"><stop stopColor="#FF8A69" /><stop offset="1" stopColor="#FFCD0F" /></linearGradient>
      <linearGradient id="mcc-coin-4" x1="12.6979" y1="8.68111" x2="15.4583" y2="15.7399" gradientUnits="userSpaceOnUse"><stop stopColor="#FFA43D" /><stop offset="1" stopColor="#FB5937" /></linearGradient>
      <linearGradient id="mcc-coin-5" x1="28.3164" y1="12.1741" x2="19.9769" y2="-2.34869" gradientUnits="userSpaceOnUse"><stop stopColor="#FF8A69" /><stop offset="1" stopColor="#FFCD0F" /></linearGradient>
    </defs>
  </svg>
);

/** Bocadillo del título "Chats Recientes" (trazo en el color del texto). */
export const ChatBubbleIcon = ({ size = 24, className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    <path d="M14 19C17.771 19 19.657 19 20.828 17.828C21.999 16.656 22 14.771 22 11C22 7.229 22 5.343 20.828 4.172C19.656 3.001 17.771 3 14 3H10C6.229 3 4.343 3 3.172 4.172C2.001 5.344 2 7.229 2 11C2 14.771 2 16.657 3.172 17.828C3.825 18.482 4.7 18.771 6 18.898" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14 19C12.764 19 11.402 19.5 10.159 20.145C8.161 21.182 7.162 21.701 6.67 21.37C6.178 21.039 6.271 20.015 6.458 17.966L6.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
