import peerDevExternals from "rollup-plugin-peer-deps-external";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";
import { createRequire } from "module";

// Safe require for ESM rollup configs
const require = createRequire(import.meta.url);
const packagejson = require("./package.json");

export default [
  {
    input: "src/index.ts",
    output: [
      {
        file: packagejson.main,
        format: "cjs",
        sourcemap: true,
        exports: "named", // FIX 1: Explicit named exports for CJS
      },
      {
        file: packagejson.module,
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      peerDevExternals(),
      resolve(),   
      commonjs(),  
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: {
            module: "ESNext",
            moduleResolution: "Bundler",
            outDir: "dist",
        },
        }),
      terser(),
      copy({
        targets: [{ src: "src/public/**/*", dest: "dist/public" }],
      }),
    ],
    external: ["react", "react-dom", "react/jsx-runtime"], 
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: packagejson.types,
        format: "es", 
      },
    ],
    plugins: [dts.default ? dts.default() : dts()],
  },
];