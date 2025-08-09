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
