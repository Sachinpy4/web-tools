// Empty module to handle server-side fallbacks for client-only packages
module.exports = {
  removeBackground: () => {
    throw new Error('Background removal is only available in the browser');
  }
}; 