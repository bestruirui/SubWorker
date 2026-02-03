module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        // Ensure Node runs transformed CommonJS (no ESM resolver issues).
        modules: 'commonjs',
      },
    ],
  ],
  plugins: [
    [
      'module-resolver',
      {
        alias: {
          '@': './src',
        },
      },
    ],
  ],
};

