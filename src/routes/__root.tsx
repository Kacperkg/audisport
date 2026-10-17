import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import Header from '../components/Header'

import appCss from '../styles.css?url'
import { useEffect } from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Audi Sport | A Legacy Forged in Competition',
      },
      {
        name: 'description',
        content:
          "An interactive journey through Audi's motorsport legacy, from quattro and Pikes Peak to Le Mans, Dakar and Formula 1.",
      },
      {
        name: 'theme-color',
        content: '#050505',
      },
      {
        property: 'og:title',
        content: 'Audi Sport | A Legacy Forged in Competition',
      },
      {
        property: 'og:description',
        content:
          "Explore Audi's defining motorsport eras and the road to Formula 1.",
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:site_name',
        content: 'Audi Sport',
      },
      {
        property: 'og:url',
        content: 'https://audi-ruddy-three.vercel.app/',
      },
      {
        property: 'og:image',
        content: 'https://audi-ruddy-three.vercel.app/audi-r26-f1.jpg',
      },
      {
        property: 'og:image:alt',
        content: 'The Audi R26 Formula 1 car',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'Audi Sport | A Legacy Forged in Competition',
      },
      {
        name: 'twitter:description',
        content:
          "Explore Audi's defining motorsport eras and the road to Formula 1.",
      },
      {
        name: 'twitter:image',
        content: 'https://audi-ruddy-three.vercel.app/audi-r26-f1.jpg',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/audi-favicon-32.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '192x192',
        href: '/audi-favicon-192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
      {
        rel: 'canonical',
        href: 'https://audi-ruddy-three.vercel.app/',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return

    window.history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    return () => {
      window.history.scrollRestoration = 'auto'
    }
  }, [])

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; scrollTo(0, 0);",
          }}
        />
        <HeadContent />
      </head>
      <body className="font-sans">
        <Header />
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
