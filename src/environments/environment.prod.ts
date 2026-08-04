export const environment = {
  production: true,
  // apiUrl: 'http://localhost:8000/api',
  // baseApiUrl: 'http://localhost:8000',
  apiUrl: 'http://192.168.1.65:8000/api',
  baseApiUrl: 'http://192.168.1.65:8000',
  apiTimeout: 30000,
  pusher: {
    key: '9fd9732315c0fe4be887',   // PUSHER_APP_KEY — public, sans risque
    cluster: 'mt1',
  },
};
