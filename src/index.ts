import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import depthLimit from 'graphql-depth-limit';
import {createServer} from 'http';
import cors from 'cors';
import {importSchema} from 'graphql-import';
import {Prisma} from 'prisma-binding';
import {Mutation} from './gql/Mutation';
import {Query} from './gql/Query';
import ShopifyAuth from 'express-shopify-auth';
import session from 'express-session';

const typeDefs = importSchema('src/schema.graphql');

const {SHOPIFY_API_SECRET_KEY, SHOPIFY_API_KEY, SCOPES} = process.env;

const db = new Prisma({
    typeDefs: 'prisma/generated/prisma.graphql',
    endpoint:
        'https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage',
    debug: true
});

const graphQLServer = new ApolloServer({
    typeDefs,
    resolvers: {
        Mutation,
        Query
    },
    validationRules: [depthLimit(7)],
    context: ({req}) => ({
        ...req,
        db
    })
});

const app = express();

app.use(session({
    secret: 'session_secret',
    resave: false,
    saveUninitialized: true
}));

app.use(
    ShopifyAuth.create({
        appKey: SHOPIFY_API_KEY,
        appSecret: SHOPIFY_API_SECRET_KEY,
        baseUrl: 'http://localhost:3000/',
        authPath: '/auth',
        authCallbackPath: '/auth/callback',
        authSuccessUrl: '/success',
        authFailUrl: '/fail',
        scope: [SCOPES],
        shop: function (req, done) {
            return done(null, req.query.shop);
        },
        onAuth: function (req, res, shop, accessToken, done) {
            // save auth info to session
            req.session.shopify = {shop: shop, accessToken: accessToken};

            console.log('accessToken', accessToken);
            return done();
        }
    })
);

app.get('/fail', function (req, res) {
    res.send('Authentication failed');
});

app.use('*', cors());

graphQLServer.applyMiddleware({app, path: '/graphql'});

const httpServer = createServer(app);
httpServer.listen(
    {port: 3000},
    (): void => console.log(`GraphQL is now running on http://localhost:3000/graphql`));