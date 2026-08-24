// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Product',
      items: ['product/scope', 'product/stakeholders'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/auth-and-organizations',
        'architecture/data-scoping',
        'architecture/deployment',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Features',
      items: [
        'features/deidentification-workflow',
        'features/reidentification',
        'features/connections',
        'features/custom-policies',
        'features/distributed-execution',
        'features/notifications',
      ],
    },
    {
      type: 'category',
      label: 'Compliance',
      items: ['compliance/regulations'],
    },
  ],
};

export default sidebars;
