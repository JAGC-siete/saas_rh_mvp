/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class'], // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        // Brand colors (centrado en #1e3a8a)
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',  // ⭐ principal
        },
        slate: { 900: '#0f172a' },   // inicio gradiente
        indigo: { 900: '#312e81' },  // fin gradiente
        // shadcn/ui compatibility
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      backgroundImage: {
        // Gradiente global con brillos sutiles
        'app-gradient': `
          radial-gradient(1200px 600px at 20% 10%, rgba(255,255,255,0.06), transparent 60%),
          radial-gradient(1000px 500px at 80% 90%, rgba(255,255,255,0.04), transparent 60%),
          linear-gradient(160deg, var(--bg-start), var(--bg-mid) 50%, var(--bg-end))
        `,
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.20)',
      },
      borderRadius: {
        lg: "16px",
        md: "12px", 
        sm: "calc(var(--radius) - 4px)",
        '2xl': '20px',
      },
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      animation: {
        'mesh-flow': 'mesh-flow 15s ease infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-line': 'glow-line 2s linear infinite',
        'fade-in': 'fade-in 0.35s ease-out forwards',
        'elastic-up': 'elastic-up 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'critical-pulse': 'critical-pulse 2s ease-in-out infinite',
        'chest-float': 'chest-float 4.5s ease-in-out infinite',
        'chest-glow': 'chest-glow 4.2s ease-in-out infinite',
      },
      keyframes: {
        'mesh-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        'glow-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'elastic-up': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'critical-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'chest-float': {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(0.8deg)' },
        },
        'chest-glow': {
          '0%, 100%': { opacity: '0.2', transform: 'translateX(-50%) scaleX(0.85)' },
          '50%': { opacity: '0.55', transform: 'translateX(-50%) scaleX(1.15)' },
        },
      },
      dropShadow: {
        'clock-glow': '0 0 15px rgba(59,130,246,0.5)',
        'severity-safe': '0 0 10px rgba(52,211,153,0.3)',
      },
      fontFamily: {
        'montserrat': ['Montserrat', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
