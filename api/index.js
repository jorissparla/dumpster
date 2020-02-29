const { ApolloServer, gql, PubSub } = require("apollo-server");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const mongoose = require("mongoose");
// const DB_URL = `mongodb+srv://energy:energy@cluster0-vhlgg.mongodb.net/test?retryWrites=true&w=majority`;
// const DB_URL = "mongodb+srv://kungfu:kungfu@cluster0-mq8bb.mongodb.net/test?retryWrites=true&w=majority";
const DB_URL = "mongodb+srv://main:main@main-6tr9d.mongodb.net/test?retryWrites=true&w=majority";

mongoose.connect(DB_URL, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true });
const db = mongoose.connection;

const energySchema = new mongoose.Schema({
  last_modified: Date,
  timestamp_utc: Number,
  date: String,
  low: Number,
  high: Number,
  electricity: Number,
  gas: Number
});
const Energy = mongoose.model("Energy", energySchema);

// gql`` parses your string into an AST
const typeDefs = gql`
  scalar Date

  type Data {
    last_modified: Date
    timestamp_utc: Int
    date: String
    low: Float
    high: Float
    electricity: Float
    gas: Float
  }

  type Query {
    allData: Data
  }
`;
const resolvers = {
  Query: {
    allData: async () => {
      try {
        const allMovies = await Energy.find();
        return allMovies;
      } catch (e) {
        console.log("e", e);
        return [];
      }
    }
  },
  Date: new GraphQLScalarType({
    name: "Date",
    description: "it's a date, deal with it",
    parseValue(value) {
      // value from the client
      return new Date(value);
    },
    serialize(value) {
      // value sent to the client
      return value.getTime();
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return new Date(ast.value);
      }
      return null;
    }
  })
};
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: true,
  playground: true,
  context: ({ req }) => {
    const fakeUser = {
      userId: "helloImauser"
    };
    return {
      ...fakeUser
    };
  }
});

db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("✅ database connected ✅");
  server
    .listen({
      port: process.env.PORT || 4000
    })
    .then(({ url }) => {
      console.log(`Server started at ${url}`);
    });
});
