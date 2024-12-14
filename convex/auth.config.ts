export default {
  providers: [
    {
      domain: process.env.AUTH0_DOMAIN,
      applicationID: process.env.AUTH0_CLIENT_ID,
    },
    {
      domain: process.env.AUTH0_DOMAIN,
      applicationID: process.env.AUTH0_IOS_CLIENT_ID,
    },
  ],
};
