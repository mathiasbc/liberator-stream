const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Enhanced fetch with retry logic and better error handling
export const fetchWithRetry = async (url, options = {}, maxRetries = 3) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Fetching ${url} (attempt ${attempt}/${maxRetries})`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      // Parse response based on content type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retrying, with exponential backoff
      const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      console.log(`Waiting ${waitTime}ms before retry...`);
      await delay(waitTime);
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
};

export { delay }; 