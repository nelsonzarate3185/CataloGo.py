import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'var(--font-public)',
  				'Public Sans',
  				'system-ui',
  				'sans-serif'
  			],
  			body: [
  				'var(--font-public)',
  				'Public Sans',
  				'system-ui',
  				'sans-serif'
  			],
  			heading: [
  				'var(--font-jakarta)',
  				'Plus Jakarta Sans',
  				'system-ui',
  				'sans-serif'
  			]
  		},
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			nav: {
  				DEFAULT: 'hsl(var(--nav))',
  				foreground: 'hsl(var(--nav-foreground))',
  				sub: 'hsl(var(--nav-sub))',
  				'sub-foreground': 'hsl(var(--nav-sub-foreground))'
  			},
  			cta: {
  				DEFAULT: 'hsl(var(--cta))',
  				foreground: 'hsl(var(--cta-foreground))'
  			},
  			link: 'hsl(var(--link))',
  			deal: 'hsl(var(--deal))',
  			star: 'hsl(var(--star))',
  			success: 'hsl(var(--success))',
  			cat: {
  				verde: 'hsl(var(--cat-verde))',
  				'verde-fondo': 'hsl(var(--cat-verde-fondo))',
  				ambar: 'hsl(var(--cat-ambar))',
  				'ambar-fondo': 'hsl(var(--cat-ambar-fondo))',
  				rojo: 'hsl(var(--cat-rojo))',
  				'rojo-fondo': 'hsl(var(--cat-rojo-fondo))',
  				naranja: 'hsl(var(--cat-naranja))',
  				'naranja-fondo': 'hsl(var(--cat-naranja-fondo))',
  				azul: 'hsl(var(--cat-azul))',
  				'azul-fondo': 'hsl(var(--cat-azul-fondo))',
  				violeta: 'hsl(var(--cat-violeta))',
  				'violeta-fondo': 'hsl(var(--cat-violeta-fondo))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			navy: {
  				'700': '#1c3650',
  				'800': '#16283d',
  				'900': '#11161d',
  				'950': '#0f1c2e'
  			},
  			sage: {
  				'50': '#f3f5f1',
  				'100': '#eef0ea',
  				'200': '#e9ebe4',
  				'300': '#dde0da',
  				'400': '#d6d9d2'
  			},
  			brand: {
  				orange: '#f6a623',
  				'orange-dark': '#ef7d22',
  				green: '#1f8a52',
  				blue: '#1a73c7',
  				red: '#c4314b'
  			}
  		},
  		fontSize: {
  			'2xs': [
  				'var(--text-2xs)',
  				{
  					lineHeight: '1.4'
  				}
  			],
  			xs: [
  				'var(--text-xs)',
  				{
  					lineHeight: '1.4'
  				}
  			],
  			sm: [
  				'var(--text-sm)',
  				{
  					lineHeight: '1.45'
  				}
  			],
  			base: [
  				'var(--text-base)',
  				{
  					lineHeight: '1.5'
  				}
  			],
  			md: [
  				'var(--text-md)',
  				{
  					lineHeight: '1.5'
  				}
  			],
  			lg: [
  				'var(--text-lg)',
  				{
  					lineHeight: '1.35'
  				}
  			],
  			xl: [
  				'var(--text-xl)',
  				{
  					lineHeight: '1.3'
  				}
  			],
  			'2xl': [
  				'var(--text-2xl)',
  				{
  					lineHeight: '1.25'
  				}
  			],
  			'3xl': [
  				'var(--text-3xl)',
  				{
  					lineHeight: '1.15'
  				}
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			pill: 'var(--radius-pill)'
  		},
  		boxShadow: {
  			card: '0 1px 3px rgba(20,30,45,.07)',
  			'card-md': '0 2px 8px rgba(20,30,45,.10)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
