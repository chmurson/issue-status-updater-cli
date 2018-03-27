module.exports = {
  parser: "babel-eslint",
  extends: ['eslint:recommended', 'prettier'],
  env: {
    browser: false,
    jasmine: true,
    jest: true,
    node: true
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        printWidth: 120,
        semi: false
      }
    ],
    'semi': ['error', 'never'],
    'no-console': 'off',
    "no-use-before-define": ["error", { "functions": false, "classes": false }]
  },
  parserOptions: {
    ecmaFeatures: {
      experimentalObjectRestSpread: true
    }
  }
};
