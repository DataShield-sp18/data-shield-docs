// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Data Shield',
  tagline: 'Project documentation — problem, solution, architecture, engineering',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // GitHub Pages deployment target.
  url: 'https://DataShield-sp18.github.io',
  baseUrl: '/data-shield-docs/',
  organizationName: 'DataShield-sp18',
  projectName: 'data-shield-docs',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/DataShield-sp18/data-shield-docs/tree/main/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Data Shield',
        logo: {
          alt: 'Data Shield logo',
          src: 'img/logo.svg',
          width: 28,
          height: 28,
        },
        items: [
          {type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs'},
          {to: '/whats-new', label: "What's new", position: 'left'},
          {
            href: 'https://github.com/DataShield-sp18/data-shield-docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        logo: {
          alt: 'Data Shield logo',
          src: 'img/logo.svg',
          width: 44,
          height: 44,
        },
        links: [
          {
            title: 'Overview',
            items: [
              {label: 'Executive summary', to: '/'},
              {label: "What's new", to: '/whats-new'},
              {label: 'Problem and solution', to: '/product/problem-and-solution'},
              {label: 'Market comparison', to: '/product/market-comparison'},
            ],
          },
          {
            title: 'Product',
            items: [
              {label: 'De-identification workflow', to: '/features/deidentification-workflow'},
              {label: 'Subscription tiers', to: '/features/subscription-tiers'},
              {label: 'Big-job compute (EMR)', to: '/features/distributed-execution'},
              {label: 'EDI parser', to: '/features/edi-parser'},
            ],
          },
          {
            title: 'Architecture',
            items: [
              {label: 'System overview', to: '/architecture/overview'},
              {label: 'Security posture', to: '/architecture/security'},
              {label: 'Compliance coverage', to: '/compliance/regulations'},
              {label: 'AWS architecture', to: '/cloud/aws-architecture'},
            ],
          },
          {
            title: 'Resources',
            items: [
              {
                label: 'Engineering wiki',
                href: 'https://github.com/DataShield-sp18/data-shield/tree/main/.wiki',
              },
              {
                label: 'Documentation source',
                href: 'https://github.com/DataShield-sp18/data-shield-docs',
              },
              {label: 'Environment variables', to: '/operations/environment-variables'},
              {label: 'Testing and coverage', to: '/operations/testing-and-coverage'},
            ],
          },
        ],
        copyright: `<div class="footer__tagline">Local-first PII/PHI de-identification &middot; No cloud AI &middot; No LLM</div><div class="footer__legal">&copy; ${new Date().getFullYear()} Data Shield. Internal project documentation &mdash; confidential, not indexed for public search.</div>`,
      },
      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
      },
    }),
};

export default config;
