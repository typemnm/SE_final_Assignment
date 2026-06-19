const path = require('path');

module.exports = {
  dependencies: {
    // RN 0.75's CLI does not infer the Android source directory from
    // react-native-config 1.6's codegen-only package layout.
    'react-native-config': {
      root: path.resolve(__dirname, 'node_modules/react-native-config'),
      platforms: {
        android: {
          sourceDir: path.resolve(__dirname, 'node_modules/react-native-config/android'),
          packageImportPath: 'import com.lugg.RNCConfig.RNCConfigPackage;',
          packageInstance: 'new RNCConfigPackage()',
        },
      },
    },
  },
};
