export const PayPalButton = () => {
  return (
    <button
      onClick={() => { window.location.href = 'https://mangamukai.com/carrito'; }}
      className="bg-[#0070ba] hover:bg-[#005ea6] text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105 flex items-center gap-2"
    >
      <span>Ir al Carrito</span>
    </button>
  );
};
