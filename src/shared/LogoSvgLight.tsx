const LogoSvgLight = () => {
  return (
    <svg className="hidden w-full dark:block" viewBox="0 0 180 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Truck body */}
      <path
        d="M5 18 L5 42 L15 42 L15 38 L45 38 L45 42 L55 42 L55 25 L45 18 L5 18 Z"
        fill="#1a3a5c"
      />
      {/* Truck cab/windshield cutout */}
      <path
        d="M45 20 L45 32 L52 32 L52 25 L45 20 Z"
        fill="#2d4a6c"
      />
      {/* Front wheel */}
      <circle cx="15" cy="42" r="6" fill="#4a5568" stroke="#1a3a5c" strokeWidth="2"/>
      <circle cx="15" cy="42" r="3" fill="#718096"/>
      {/* Back wheel */}
      <circle cx="45" cy="42" r="6" fill="#4a5568" stroke="#1a3a5c" strokeWidth="2"/>
      <circle cx="45" cy="42" r="3" fill="#718096"/>
      {/* Location pin */}
      <path
        d="M35 5 C28 5 22 11 22 18 C22 27 35 38 35 38 C35 38 48 27 48 18 C48 11 42 5 35 5 Z"
        fill="#1a9a9a"
      />
      {/* Pin inner circle */}
      <circle cx="35" cy="17" r="6" fill="white"/>
      {/* Pin hole */}
      <circle cx="35" cy="17" r="3" fill="#0d7377"/>
      {/* PickIt text - light/gray for dark mode */}
      <text x="70" y="35" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="bold" fill="#e0e0e0">
        <tspan>Picklt</tspan>
      </text>
    </svg>
  )
}

export default LogoSvgLight
