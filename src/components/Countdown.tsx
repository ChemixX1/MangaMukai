import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export const Countdown = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft("¡Ya disponible!");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      // Formato bonito: "2d 5h" o "05h 30m"
      if (days > 0) setTimeLeft(`${days}d ${hours}h`);
      else setTimeLeft(`${hours}h ${minutes}m`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000); // Actualiza cada minuto

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <span className="text-[10px] text-pink-400 font-mono flex items-center gap-1 bg-pink-500/10 px-2 py-1 rounded">
      <Clock size={10} /> {timeLeft}
    </span>
  );
};