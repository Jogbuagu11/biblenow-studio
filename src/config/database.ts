// Database configuration
export const dbConfig = {
  host: process.env.REACT_APP_DB_HOST || 'localhost',
  port: parseInt(process.env.REACT_APP_DB_PORT || '5432'),
  database: process.env.REACT_APP_DB_NAME || 'biblenow_studio',
  user: process.env.REACT_APP_DB_USER || 'postgres',
  password: process.env.REACT_APP_DB_PASSWORD || '',
  ssl: process.env.REACT_APP_DB_SSL === 'true',
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001/api'
}; 