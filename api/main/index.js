const { ApolloServer, gql, PubSub } = require("apollo-server");
const { GraphQLScalarType } = require("graphql");
const { Kind } = require("graphql/language");
const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://kungfu:kungfu@cluster0-mq8bb.mongodb.net/test?retryWrites=true&w=majority", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;

var movieSchema = new mongoose.Schema({
  title: String,
  releaseDate: Date,
  rating: Number,
  status: String,
  actorIds: [String]
});

const Movie = mongoose.model("Movie", movieSchema);

// gql`` parses your string into an AST
const typeDefs = gql`
  scalar Date

  enum Status {
    WATCHED
    INTERESTED
    NOT_INTERESTED
    UNKNOWN
  }

  type Actor {
    id: ID!
    name: String!
  }

  type Movie {
    id: ID!
    title: String!
    releaseDate: Date
    rating: Int
    status: Status
    actor: [Actor]
  }

  type Query {
    movies: [Movie]
    movie(id: ID): Movie
    hi: String
  }

  input ActorInput {
    id: ID
  }

  input MovieInput {
    id: ID
    title: String
    releaseDate: Date
    rating: Int
    status: Status
    actor: [ActorInput]
  }

  type Mutation {
    addMovie(movie: MovieInput): [Movie]
  }

  type Subscription {
    movieAdded: Movie
  }
`;

const actors = [
  {
    id: "gordon",
    name: "Gordon Liu"
  },
  {
    id: "jackie",
    name: "Jackie Chan"
  }
];

const movies = [
  {
    id: "asdfasddfd",
    title: "5 Deadly Venoms",
    releaseDate: new Date("10-12-1983"),
    actor: [
      {
        id: "jackie"
      }
    ]
  },
  {
    id: "asdfasddfddddd",
    title: "36th Chamber",
    releaseDate: new Date("10-10-1983"),
    rating: 5,
    actor: [
      {
        id: "gordon"
      }
    ]
  }
];

const pubsub = new PubSub();
const MOVIE_ADDED = "MOVIE_ADDED";

const resolvers = {
  Subscription: {
    movieAdded: {
      subscribe: () => pubsub.asyncIterator([MOVIE_ADDED])
    }
  },

  Query: {
    movies: async () => {
      try {
        const allMovies = await Movie.find();
        return allMovies;
      } catch (e) {
        console.log("e", e);
        return [];
      }
    },
    hi: () => process.env.DB_URL,
    movie: async (obj, { id }) => {
      try {
        const foundMovie = await Movie.findById(id);
        return foundMovie;
      } catch (e) {
        console.log("e", e);
        return {};
      }
    }
  },

  Movie: {
    actor: (obj, arg, context) => {
      // DB Call
      const actorIds = obj.actor.map(actor => actor.id);
      const filteredActors = actors.filter(actor => {
        return actorIds.includes(actor.id);
      });
      return filteredActors;
    }
  },

  Mutation: {
    addMovie: async (obj, { movie }, { userId }) => {
      try {
        if (userId) {
          // Do mutation and of database stuff
          const newMovie = await Movie.create({
            ...movie
          });
          pubsub.publish(MOVIE_ADDED, { movieAdded: newMovie });
          const allMovies = await Movie.find();
          return allMovies;
        }
        return movies;
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
