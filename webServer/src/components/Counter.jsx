import { useEffect, useState } from "react";

export default function Counter() {
  const MAX_DISTANCE = 75;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      // Generate random value between 0 and 70
      const randomValue = Math.random() * MAX_DISTANCE;

      // 1 decimal like ultrasonic (40.1 cm)
      setCount(parseFloat(randomValue.toFixed(1)));

    }, 1000); // updates every 0.5 second

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-2xl font-thin text-cyan-300">{count.toFixed(1)} cm</span>
  );
}