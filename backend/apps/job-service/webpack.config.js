const { composePlugins, withNx } = require('@nx/webpack');

module.exports = composePlugins(withNx(), (config) => {
  const swcRule = config.module.rules.find(
    (r) => r && r.loader && r.loader.includes('swc-loader'),
  );
  if (swcRule) {
    swcRule.options = {
      ...swcRule.options,
      jsc: {
        ...swcRule.options.jsc,
        target: 'es2021',
        loose: false,
      },
    };
  }
  return config;
});
