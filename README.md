# gist-gemini-fancy
Proof of concept to explore fancy conflict resolution for images

## Getting started
To reuse our proof of concept, run the following steps:

```bash
# Clone our repo
git clone https://gist.github.com/2745867438113ed97ad5a39b7a2a410e.git gist-gemini-fancy
cd gist-gemini-fancy

# Install our dependencies (including Selenium)
npm install
npm run webdriver-update

# Capture our normal Gemini images
ENV=normal npm run gemini-update

# Capture our alternate Gemini images (causing a diff)
ENV=alt npm run gemini-test
```
