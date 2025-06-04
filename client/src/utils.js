// Utility function to interpolate variables in translated strings
export const interpolate = (text, variables = {}) => {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key] !== undefined ? variables[key] : match;
  });
};

// Utility function to handle HTML-like interpolation
export const interpolateHtml = (text, variables = {}) => {
  let result = text;
  
  // Handle variables first
  result = interpolate(result, variables);
  
  // Convert <strong> tags to HTML
  result = result.replace(/<strong>/g, '<strong>').replace(/<\/strong>/g, '</strong>');
  
  return result;
}; 