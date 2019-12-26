import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import depthLimit from 'graphql-depth-limit';
import { createServer } from 'http';
import cors from 'cors';
import { importSchema } from "graphql-import";
import { Prisma } from "prisma-binding";
import { Mutation } from "./gql/Mutation";
import { Query } from "./gql/Query";

const typeDefs = importSchema("src/schema.graphql");

const db = new Prisma({
  typeDefs: "prisma/generated/prisma.graphql",
  endpoint:
      "https://eu1.prisma.sh/dmytro-hachok-b9054e/countdown-service/countdown-stage",
  debug: true
});

const graphQLServer = new ApolloServer({
  typeDefs,
  resolvers: {
    Mutation,
    Query
  },
  validationRules: [depthLimit(7)],
  context: ({ req }) => ({
    ...req,
    db
  })
});

const app = express();

app.use('*', cors());

graphQLServer.applyMiddleware({ app, path: '/graphql' });

const httpServer = createServer(app);
httpServer.listen(
    { port: 3000 },
    (): void => console.log(`GraphQL is now running on http://localhost:3000/graphql`));