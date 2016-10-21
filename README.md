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

# Start our server
npm start

# In another tab, start our Selenium server
npm run webdriver-start

# In yet another tab:
# Capture our normal Gemini images
ENV=normal npm run gemini-update

# Capture our alternate Gemini images (causing a diff)
ENV=alt npm run gemini-test

# Open our prototype page in your browser
xdg-open http://localhost:3000/prototype
# or open our performance page
xdg-open http://localhost:3000/performance
```
