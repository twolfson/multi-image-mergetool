// Load in domo and bind it to the document
void require('domo/lib/domo.js')(document);

// Export the window's domo
module.exports = window.domo;
