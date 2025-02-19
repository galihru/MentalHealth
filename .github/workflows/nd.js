name: Build and Publish

on:
  push:
    branches:
      - main

jobs:
  build-and-publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        
      - name: Test build output
        run: |
          if [ ! -d "dist" ]; then
            echo "dist directory not found"
            exit 1
          fi
          ls -la dist
      
      - name: Publish to NPM
        if: success()
        run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Create GitHub Release
        if: success()
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: v${{ github.run_number }}
          release_name: Mental Health
          body: |
            Mental Health App with Emotion Detection
            
            Built and published automatically via GitHub Actions
          draft: false
          prerelease: false
