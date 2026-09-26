const fs = require('fs');
const path = require('path');

const ALLOWED_ENV_KEYS = new Set([
  'TRUSTLEDGE_KYC_API_BASE_URL',
  'VITE_CLOUDINARY_CLOUD_NAME',
  'VITE_CLOUDINARY_UPLOAD_PRESET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_UPLOAD_PRESET',
]);       

const readDotEnv = () => {
  const rootEnv = path.resolve(__dirname, '..', '.env');
  const cwdEnv = path.resolve(process.cwd(), '.env');
  const envPath = fs.existsSync(rootEnv) ? rootEnv : cwdEnv;
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .reduce((values, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        return values;
      }

      const equalsIndex = trimmed.indexOf('=');
      if (equalsIndex === -1) {
        return values;
      }

      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, '');
      values[key] = value;
      return values;
    }, {});
};

module.exports = ({ types: t }) => {
  const dotEnv = readDotEnv();

  return {
    name: 'trustledge-inline-env',
    visitor: {
      MemberExpression(path) {
        const node = path.node;
        if (
          !t.isMemberExpression(node.object) ||
          !t.isIdentifier(node.object.object, { name: 'process' }) ||
          !t.isIdentifier(node.object.property, { name: 'env' }) ||
          !t.isIdentifier(node.property)
        ) {
          return;
        }

        const key = node.property.name;
        if (!ALLOWED_ENV_KEYS.has(key)) {
          return;
        }

        path.replaceWith(t.stringLiteral(process.env[key] || dotEnv[key] || ''));
      },
    },
  };
};
