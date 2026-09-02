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
        'architecture/tech-stack',
        'architecture/auth-and-organizations',
        'architecture/data-scoping',
        'architecture/deployment',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Engineering',
      items: [
        'engineering/detection-pipeline',
        'engineering/medical-code-detection',
        'engineering/ingestion-and-formats',
        'engineering/policy-and-operators',
        'engineering/secure-output-and-vault',
        'engineering/distributed-execution',
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
        'features/platform-admin-portal',
      ],
    },
    {
      type: 'category',
      label: 'Machine learning',
      items: ['ml/xgboost-model', 'ml/training-run-output'],
    },
    {
      type: 'category',
      label: 'Operations',
      items: ['operations/environment-variables', 'operations/testing-and-coverage'],
    },
    {
      type: 'category',
      label: 'Compliance',
      items: ['compliance/regulations'],
    },
  ],
};

export default sidebars;
