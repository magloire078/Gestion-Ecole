import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "2rem",
        lg: "4rem",
      },
      screens: {
        "2xl": "1400px",
        "3xl": "1600px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xs': ['0.5rem', { lineHeight: '0.625rem' }],
        'display-lg': ['3.5rem', { lineHeight: '1.1', fontWeight: '800' }],
        'display-md': ['2.5rem', { lineHeight: '1.2', fontWeight: '700' }],
        'display-sm': ['1.875rem', { lineHeight: '2.25rem' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          border: "hsl(var(--sidebar-border))",
          accent: "hsl(var(--sidebar-accent))",
          'accent-foreground': "hsl(var(--sidebar-accent-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))",
          950: "hsl(var(--primary-950))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
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
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
          '6': 'hsl(var(--chart-6))',
        },
        // Couleurs spécifiques à l'éducation
        education: {
          blue: '#3b82f6',
          green: '#10b981',
          purple: '#8b5cf6',
          orange: '#f59e0b',
          pink: '#ec4899',
          cyan: '#06b6d4',
        },
        grade: {
          'A': '#10b981',
          'B': '#34d399',
          'C': '#fbbf24',
          'D': '#f97316',
          'F': '#ef4444',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        '4xl': '2rem',
        '5xl': '3rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
        '144': '36rem',
      },
      width: {
        'sidebar-collapsed': '5rem',
        'sidebar-expanded': '16rem',
        'main-content': 'calc(100% - 16rem)',
        'main-collapsed': 'calc(100% - 5rem)',
      },
      height: {
        'header': '4rem',
        'sidebar': 'calc(100vh - 4rem)',
        'screen-90': '90vh',
        'screen-80': '80vh',
      },
      minHeight: {
        'screen-75': '75vh',
        'screen-50': '50vh',
      },
      maxHeight: {
        'screen-90': '90vh',
        'screen-80': '80vh',
        'modal': 'calc(100vh - 10rem)',
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(100%)", opacity: "0" },
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)", opacity: "1" },
          "100%": { transform: "translateX(-100%)", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "progress": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(400%)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "wiggle": {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
        "typewriter": {
          "from": { width: "0" },
          "to": { width: "100%" },
        },
        "blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-in",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-in",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-in",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-in",
        "bounce-subtle": "bounce-subtle 2s infinite",
        "pulse-subtle": "pulse-subtle 2s infinite",
        "shimmer": "shimmer 2s infinite linear",
        "progress": "progress 1.5s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "float": "float 3s ease-in-out infinite",
        "wiggle": "wiggle 0.5s ease-in-out",
        "typewriter": "typewriter 2s steps(40) 1s 1 normal both",
        "blink": "blink 1s step-end infinite",
        "spin-slow": "spin 3s linear infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-dashboard': 'linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(var(--secondary) / 0.1) 100%)',
        'gradient-sidebar': 'linear-gradient(180deg, hsl(var(--sidebar-background)) 0%, hsl(var(--sidebar-background) / 0.9) 100%)',
        'gradient-card': 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--card) / 0.95) 100%)',
        'gradient-success': 'linear-gradient(135deg, hsl(var(--success)) 0%, hsl(var(--success) / 0.8) 100%)',
        'gradient-warning': 'linear-gradient(135deg, hsl(var(--warning)) 0%, hsl(var(--warning) / 0.8) 100%)',
        'gradient-info': 'linear-gradient(135deg, hsl(var(--info)) 0%, hsl(var(--info) / 0.8) 100%)',
        'grid-pattern': 'linear-gradient(to right, hsl(var(--border) / 0.1) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.1) 1px, transparent 1px)',
        'dot-pattern': 'radial-gradient(hsl(var(--muted-foreground) / 0.2) 1px, transparent 1px)',
        'checkerboard': 'repeating-conic-gradient(hsl(var(--muted) / 0.1) 0% 25%, transparent 0% 50%) 50% / 20px 20px',
      },
      backgroundSize: {
        'grid-16': '16px 16px',
        'grid-20': '20px 20px',
        'grid-24': '24px 24px',
        'dot-4': '4px 4px',
        'dot-8': '8px 8px',
        'auto-400': 'auto 400%',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px hsl(var(--foreground) / 0.07), 0 10px 20px -2px hsl(var(--foreground) / 0.04)',
        'medium': '0 4px 25px -5px hsl(var(--foreground) / 0.1), 0 10px 30px -5px hsl(var(--foreground) / 0.04)',
        'hard': '0 10px 40px -10px hsl(var(--foreground) / 0.2), 0 25px 50px -12px hsl(var(--foreground) / 0.1)',
        'inner-soft': 'inset 0 2px 4px 0 hsl(var(--foreground) / 0.05)',
        'inner-medium': 'inset 0 4px 6px -1px hsl(var(--foreground) / 0.1)',
        'sidebar': '4px 0 15px -3px hsl(var(--foreground) / 0.05)',
        'card-hover': '0 20px 40px -15px hsl(var(--foreground) / 0.1), 0 10px 20px -5px hsl(var(--foreground) / 0.04)',
        'glow-primary': '0 0 20px hsl(var(--primary) / 0.3)',
        'glow-success': '0 0 20px hsl(var(--success) / 0.3)',
        'glow-warning': '0 0 20px hsl(var(--warning) / 0.3)',
        'glow-destructive': '0 0 20px hsl(var(--destructive) / 0.3)',
        'border-glow': '0 0 0 1px hsl(var(--primary) / 0.3), 0 0 10px hsl(var(--primary) / 0.2)',
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
        'width': 'width',
        'sidebar': 'width, transform, opacity',
        'colors': 'background-color, border-color, color, fill, stroke',
        'all': 'all',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
        '800': '800ms',
        '1200': '1200ms',
      },
      transitionTimingFunction: {
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'elastic': 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      zIndex: {
        'dropdown': 1000,
        'sticky': 1020,
        'fixed': 1030,
        'modal-backdrop': 1040,
        'modal': 1050,
        'popover': 1060,
        'tooltip': 1070,
        'toast': 1080,
        'max': 9999,
      },
      gridTemplateColumns: {
        'dashboard': 'auto 1fr',
        'sidebar-layout': '16rem 1fr',
        'sidebar-collapsed': '5rem 1fr',
        'grades': 'repeat(auto-fit, minmax(200px, 1fr))',
        'stats': 'repeat(auto-fit, minmax(150px, 1fr))',
        'calendar': 'repeat(7, minmax(0, 1fr))',
      },
      gridTemplateRows: {
        'layout': 'auto 1fr auto',
        'dashboard': 'auto 1fr',
        'modal': 'auto 1fr auto',
        'table': 'auto repeat(auto-fill, minmax(3rem, auto))',
      },
      scale: {
        '102': '1.02',
        '98': '0.98',
      },
      blur: {
        'xs': '2px',
      },
      screens: {
        'print': { 'raw': 'print' },
        '3xl': '1600px',
        '4xl': '1920px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    function({ addUtilities, theme }) {
      const newUtilities = {
        // Utilities pour les tables
        '.table-fixed-layout': {
          'table-layout': 'fixed',
        },
        '.table-auto-layout': {
          'table-layout': 'auto',
        },
        // Utilities pour le text overflow avec ellipsis multiple lignes
        '.line-clamp-1': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '1',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        '.line-clamp-2': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '2',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        '.line-clamp-3': {
          'display': '-webkit-box',
          '-webkit-line-clamp': '3',
          '-webkit-box-orient': 'vertical',
          'overflow': 'hidden',
        },
        // Utilities pour les gradients text
        '.text-gradient-primary': {
          'background': `linear-gradient(135deg, ${theme('colors.primary.500')}, ${theme('colors.primary.700')})`,
          '-webkit-background-clip': 'text',
          '-webkit-text-fill-color': 'transparent',
          'background-clip': 'text',
        },
        // Utilities pour les scrollbars personnalisées
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
        },
        '.scrollbar-thumb-rounded': {
          '&::-webkit-scrollbar-thumb': {
            'border-radius': '9999px',
          },
        },
        // Utilities pour les effets de glassmorphism
        '.glass': {
          'background': 'hsla(var(--background) / 0.8)',
          'backdrop-filter': 'blur(10px)',
        },
        '.glass-dark': {
          'background': 'hsla(var(--foreground) / 0.05)',
          'backdrop-filter': 'blur(10px)',
        },
        // Utilities pour les séparateurs
        '.divider-y': {
          '& > * + *': {
            'border-top': '1px solid hsl(var(--border))',
          },
        },
        '.divider-x': {
          '& > * + *': {
            'border-left': '1px solid hsl(var(--border))',
          },
        },
        // Utility pour les ombres de text
        '.text-shadow': {
          'text-shadow': '0 2px 4px hsl(var(--foreground) / 0.1)',
        },
        '.text-shadow-lg': {
          'text-shadow': '0 4px 8px hsl(var(--foreground) / 0.2)',
        },
        // Utilities pour les transitions de height auto
        '.transition-height': {
          'transition-property': 'height',
          'transition-timing-function': 'cubic-bezier(0.4, 0, 0.2, 1)',
          'transition-duration': '300ms',
        },
        // Utility pour les backgrounds de chargement (skeleton)
        '.skeleton': {
          'background': `linear-gradient(90deg, 
            hsl(var(--muted)) 25%, 
            hsl(var(--muted-foreground) / 0.2) 50%, 
            hsl(var(--muted)) 75%
          )`,
          'background-size': '200% 100%',
          'animation': 'shimmer 2s infinite linear',
        },
        // Utility pour les badges avec glow
        '.badge-glow': {
          'box-shadow': '0 0 10px currentColor',
        },
        // Utility pour les cards interactives
        '.card-hover': {
          'transition': 'all 0.3s ease',
          '&:hover': {
            'transform': 'translateY(-4px)',
            'box-shadow': theme('boxShadow.card-hover'),
          },
        },
        // Utility pour les tooltips personnalisés
        '.tooltip-arrow': {
          'position': 'relative',
          '&::after': {
            'content': '""',
            'position': 'absolute',
            'top': '100%',
            'left': '50%',
            'transform': 'translateX(-50%)',
            'border': '6px solid transparent',
            'border-top-color': 'hsl(var(--popover))',
          },
        },
        // Utility pour les formes géométriques
        '.triangle-up': {
          'width': '0',
          'height': '0',
          'border-left': '8px solid transparent',
          'border-right': '8px solid transparent',
          'border-bottom': '12px solid currentColor',
        },
        '.triangle-down': {
          'width': '0',
          'height': '0',
          'border-left': '8px solid transparent',
          'border-right': '8px solid transparent',
          'border-top': '12px solid currentColor',
        },
      };
      
      addUtilities(newUtilities, ['responsive', 'hover']);
    },
  ],
  safelist: [
    // Classes dynamiques pour les notes
    'bg-grade-A',
    'bg-grade-B', 
    'bg-grade-C',
    'bg-grade-D',
    'bg-grade-F',
    'text-grade-A',
    'text-grade-B',
    'text-grade-C',
    'text-grade-D',
    'text-grade-F',
    // Classes pour les statuts
    'bg-success',
    'bg-warning',
    'bg-destructive',
    'bg-info',
    // Classes pour les animations
    'animate-pulse-subtle',
    'animate-bounce-subtle',
    'animate-float',
    // Classes pour les grid
    'grid-cols-grades',
    'grid-cols-stats',
    'grid-cols-calendar',
  ],
} satisfies Config;
