const { ApolloServer, gql, PubSub, makeExecutableSchema } = require('apollo-server');
const { applyMiddleware } = require('graphql-middleware');
const { shield, deny, allow, rule } = require('graphql-shield');

const pubsub = new PubSub();

const books = [
  {
    title: 'Harry Potter and the Chamber of Secrets',
    author: 'J.K. Rowling',
  },
  {
    title: 'Jurassic Park',
    author: 'Michael Crichton',
  },
];

const typeDefs = gql`
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
  }
  
  type Subscription {
    book: Book
  }
`;

const resolvers = {
  Query: {
    books: () => books,
  },
  Subscription: {
    book: {
        subscribe: () => pubsub.asyncIterator(['book']),
        resolve: payload => payload,
    },
  },
};

// Rule runs on resolve function above but not on subscribe function where it would be useful
const check = rule({
  cache: 'no_cache',
})(async () => {
  console.log('----------- Rule check -----------');
  return true;
});

const permissions = {
  Query: {
    books: allow,
  },
  Subscription: {
    book: check,
  },
  Book: allow,
};

const shieldMiddleware = shield(permissions, {
  fallbackRule: deny,
});

const schema = applyMiddleware(
  makeExecutableSchema({
    typeDefs,
    resolvers,
  }),
  shieldMiddleware,
);

const server = new ApolloServer({ schema });

server.listen({ port: 4100 }).then(({ url, subscriptionsUrl }) => {
  console.log(`🚀  Server ready at ${url}`);
  console.log(`🚀  Subscriptions ready at ${subscriptionsUrl}`);
});

setInterval(()=>pubsub.publish('book', books[0]), 1000);
