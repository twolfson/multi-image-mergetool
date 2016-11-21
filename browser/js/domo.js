// Load in domo and bind it to the document
void require('domo/lib/domo.js')(document);

// Remove global pollution caused by Domo which breaks Sinon
delete global.global;

// Export the window's domo
module.exports = window.domo;
