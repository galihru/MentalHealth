import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/EmotionDetection.js',
  output: [
    {
      file: 'dist/EmotionDetection.js',
      format: 'umd',
      name: 'EmotionDetection',
      sourcemap: true
    },
    {
      file: 'dist/EmotionDetection.esm.js',
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
    'helmet'
  ]
};
