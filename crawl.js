const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  maxConcurrent: 1, // Number of concurrent requests
  minTime: 1000,   // Minimum time between requests (in milliseconds)
});

async function crawlUrl(url, depth, maxDepth, results) {
  if (depth > maxDepth) {
    return;
  }

  try {
    await limiter.schedule(async () => {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract and save images from the current page
      $('img').each((_, element) => {
        const imgSrc = $(element).attr('src');
        if (imgSrc) {
          results.push({
            imageUrl: imgSrc,
            sourceUrl: url,
            depth: depth,
          });
        }
      });

      // Recursively crawl links on the current page
      $('a').each(async (_, element) => {
        const link = $(element).attr('href');
        if (link && link.startsWith('http')) {
          await crawlUrl(link, depth + 1, maxDepth, results);
        }
      });
    });
  } catch (error) {
    console.error(`Error crawling ${url}: ${error.message}`);
  }
}

async function main() {
  const startUrl = 'https://www.atlassian.com/'; // Change the url
  const depth = 2;  // Change the maximum depth to 2
  const results = [];

  await crawlUrl(startUrl, 0, depth, results);

  const jsonData = JSON.stringify({ results }, null, 4);
  fs.writeFileSync('results.json', jsonData);

  console.log('Crawling completed. Results saved to results.json');
}

main();
