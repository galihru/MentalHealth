import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/emotion-detection.js',
  output: [
    {
      file: 'dist/emotion-detection.js',
      format: 'umd',
      name: 'EmotionDetection',
      sourcemap: true
    },
    {
      file: 'dist/emotion-detection.esm.js',
      format: 'es',
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    terser()
  ],
  external: [
    '@mediapipe/face_mesh',
    'crypto',
    'express',
    'helmet'
  ]
};
