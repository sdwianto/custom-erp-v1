module.exports = {
  rules: {
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { 
      "argsIgnorePattern": "^_",
      "varsIgnorePattern": "^_" 
    }],
    '@typescript-eslint/consistent-type-imports': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn'
  }
};
