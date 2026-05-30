import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([".next/**", "out/**", "build/**", "src/generated/**", "next-env.d.ts"]),
  {
    rules: {
      // Reglas nuevas de React 19 incompatibles con carga de datos en useEffect
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
