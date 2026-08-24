// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Data Shield',
  tagline: 'Stakeholder briefing — status, architecture, decisions',
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
        items: [
          {type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs'},
          {
            href: 'https://github.com/DataShield-sp18/data-shield-docs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'This site',
            items: [
              {label: 'Start here', to: '/'},
              {label: 'Features', to: '/features/deidentification-workflow'},
            ],
          },
          {
            title: 'Engineering knowledge base',
            items: [
              {
                label: 'Data Shield wiki (repo)',
                href: 'https://github.com/DataShield-sp18/data-shield/tree/main/.wiki',
              },
            ],
          },
        ],
        copyright: `Data Shield — internal stakeholder documentation. Not indexed for public search.`,
      },
      prism: {
        theme: prismThemes.oneLight,
        darkTheme: prismThemes.oneDark,
      },
    }),
};

export default config;
