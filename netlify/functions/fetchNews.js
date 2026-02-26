const axios = require('axios');

exports.handler = async (event, context) => {
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

  const { endpoint, category } = event.queryStringParameters || {};

  try {
    let response;

    switch (endpoint) {
      case 'topNews':
        response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: 'us',
            apiKey: NEWS_API_KEY,
            pageSize: 10,
            language: 'en'
          }
        });
        break;

      case 'category':
        if (!category) {
          return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Category is required' })
          };
        }
        response = await axios.get('https://newsapi.org/v2/top-headlines', {
          params: {
            country: 'us',
            category: category,
            apiKey: NEWS_API_KEY,
            pageSize: 10,
            language: 'en'
          }
        });
        break;

      case 'opinions':
        response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: '(opinion OR editorial) AND (politics OR economy OR society OR culture)',
            sortBy: 'publishedAt',
            language: 'en',
            apiKey: NEWS_API_KEY,
            pageSize: 15
          }
        });
        break;

      case 'videos':
        response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'CNN OR Fox News OR MSNBC',
            sortBy: 'publishedAt',
            language: 'en',
            apiKey: NEWS_API_KEY,
            pageSize: 15
          }
        });
        break;

      case 'trending':
        response = await axios.get('https://newsapi.org/v2/everything', {
          params: {
            q: 'podcast OR interview OR "TED talk"',
            domains: 'npr.org,ted.com,pbs.org,bbc.com,cnn.com',
            sortBy: 'publishedAt',
            language: 'en',
            apiKey: NEWS_API_KEY,
            pageSize: 10
          }
        });
        break;

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid endpoint' })
        };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify(response.data)
    };

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    
    return {
      statusCode: error.response?.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Failed to fetch news',
        message: error.message 
      })
    };
  }
};
