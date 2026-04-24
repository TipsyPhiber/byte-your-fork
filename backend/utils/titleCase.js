const toTitleCase = (str) => str?.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

module.exports = { toTitleCase };
