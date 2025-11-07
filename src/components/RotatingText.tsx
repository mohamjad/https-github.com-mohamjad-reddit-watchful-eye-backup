import { useState, useEffect } from "react";

const RotatingText = () => {
  const words = ["indie hackers", "developers", "founders", "startups"];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="inline-block overflow-hidden h-7 align-middle">
      <span 
        className={`inline-block text-lg text-primary font-medium transition-all duration-300 ${
          isAnimating ? '-translate-y-7 opacity-0' : 'translate-y-0 opacity-100'
        }`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        {words[currentIndex]}
      </span>
    </span>
  );
};

export default RotatingText;
