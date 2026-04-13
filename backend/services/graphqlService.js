/**
 * GraphQL Schema and Resolvers
 * Provides GraphQL API for complex queries and integrations
 */

const { gql, ApolloServer } = require('apollo-server-express');
const logger = require('../middleware/logger');

// =========================================================================
// GRAPHQL SCHEMA
// =========================================================================

const typeDefs = gql`
  type Query {
    # Products
    products(
      limit: Int
      offset: Int
      category: String
      minPrice: Float
      maxPrice: Float
    ): ProductConnection!
    productById(id: Int!): Product
    searchProducts(query: String!, limit: Int): [Product!]!

    # Orders
    myOrders(limit: Int): [Order!]!
    orderById(id: Int!): Order
    ordersByStatus(status: String!): [Order!]!

    # User
    me: User
    userById(id: Int!): User
    userProfile(username: String!): User

    # Creator Stats
    creatorStats(creatorId: Int!): CreatorStats!
    creatorDrops(creatorId: Int!): [CreatorDrop!]!
    activeAuctions(limit: Int): [AuctionListing!]!

    # Recommendations
    recommendedProducts(limit: Int): [Product!]!
    trendingProducts(limit: Int): [Product!]!

    # Admin
    platformStats: PlatformStats @requiresRole(role: "admin")
    pendingVerifications: [VerificationRecord!]! @requiresRole(role: "admin")
  }

  type Mutation {
    # Auth
    register(email: String!, username: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    logout: Boolean!

    # Products
    createProduct(input: CreateProductInput!): Product!
    updateProduct(id: Int!, input: UpdateProductInput!): Product!
    deleteProduct(id: Int!): Boolean!

    # Orders
    createOrder(items: [OrderItemInput!]!): Order!
    updateOrderStatus(orderId: Int!, status: String!): Order!
    cancelOrder(orderId: Int!): Order!

    # Creator
    createDrop(input: CreateDropInput!): CreatorDrop!
    createAuction(input: CreateAuctionInput!): AuctionListing!
    placeBid(auctionId: Int!, amount: Float!): AuctionBid!

    # Social
    followUser(userId: Int!): Boolean!
    unfollowUser(userId: Int!): Boolean!
    likeProduct(productId: Int!): Boolean!
    unlikeProduct(productId: Int!): Boolean!

    # Admin
    approveKYC(recordId: Int!): VerificationRecord! @requiresRole(role: "admin")
    rejectKYC(recordId: Int!, reason: String!): VerificationRecord! @requiresRole(role: "admin")
    flagProduct(productId: Int!, reason: String!): Product! @requiresRole(role: "admin")
  }

  type Subscription {
    orderStatusChanged(orderId: Int!): Order!
    auctionBidPlaced(auctionId: Int!): AuctionBid!
    productPriceChanged(productId: Int!): Product!
    newMessage(threadId: Int!): Message!
  }

  # ========================================================================
  # TYPES
  # ========================================================================

  type Product {
    id: Int!
    name: String!
    description: String!
    price: Float!
    category: String!
    image: String
    stock: Int!
    rating: Float!
    reviewCount: Int!
    seller: User!
    reviews: [Review!]!
    likes: Int!
    acceptedChains: [String!]!
    tags: [String!]!
    createdAt: DateTime!
  }

  type ProductConnection {
    nodes: [Product!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type Order {
    id: Int!
    orderNumber: String!
    status: String!
    total: Float!
    user: User!
    items: [OrderItem!]!
    paymentMethod: String!
    paymentStatus: String!
    shippingAddress: String!
    trackingNumber: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type OrderItem {
    id: Int!
    product: Product!
    quantity: Int!
    price: Float!
  }

  type User {
    id: Int!
    username: String!
    email: String!
    avatar: String
    bio: String
    reputation: Float!
    isSeller: Boolean!
    isVerified: Boolean!
    isCreator: Boolean!
    followers: Int!
    following: Int!
    products: [Product!]
    sellerProfile: SellerProfile
  }

  type SellerProfile {
    storeName: String!
    storeDescription: String
    rating: Float!
    productCount: Int!
  }

  type Review {
    id: Int!
    rating: Int!
    comment: String!
    author: User!
    createdAt: DateTime!
  }

  type CreatorDrop {
    id: Int!
    name: String!
    description: String!
    price: Float!
    maxQuantity: Int!
    quantitySold: Int!
    startTime: DateTime!
    endTime: DateTime!
    products: [Product!]!
    status: String!
  }

  type CreatorStats {
    productsCount: Int!
    totalOrders: Int!
    totalEarnings: Float!
    followers: Int!
    avgRating: Float!
  }

  type AuctionListing {
    id: Int!
    title: String!
    startPrice: Float!
    currentBid: Float!
    highestBidder: User
    endTime: DateTime!
    status: String!
    bids: [AuctionBid!]!
  }

  type AuctionBid {
    id: Int!
    amount: Float!
    bidder: User!
    createdAt: DateTime!
  }

  type Message {
    id: Int!
    content: String!
    sender: User!
    createdAt: DateTime!
  }

  type VerificationRecord {
    id: Int!
    user: User!
    status: String!
    recordType: String!
    verifiedAt: DateTime
  }

  type PlatformStats {
    totalUsers: Int!
    totalProducts: Int!
    totalGMV: Float!
    activeListings: Int!
    verifiedSellers: Int!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  scalar DateTime

  input CreateProductInput {
    name: String!
    description: String!
    price: Float!
    category: String!
    stock: Int!
    image: String
    acceptedChains: [String!]
  }

  input UpdateProductInput {
    name: String
    description: String
    price: Float
    stock: Int
  }

  input CreateDropInput {
    name: String!
    description: String!
    price: Float!
    maxQuantity: Int!
    startTime: DateTime!
    endTime: DateTime!
  }

  input CreateAuctionInput {
    productId: Int!
    title: String!
    startPrice: Float!
    endTime: DateTime!
  }

  input OrderItemInput {
    productId: Int!
    quantity: Int!
  }

  directive @requiresRole(role: String!) on FIELD_DEFINITION
`;

// =========================================================================
// RESOLVERS
// =========================================================================

class GraphQLResolvers {
  constructor(db, authService, creatorService, cacheService) {
    this.db = db;
    this.auth = authService;
    this.creator = creatorService;
    this.cache = cacheService;
  }

  getResolvers() {
    return {
      Query: {
        // Products
        products: async (_, args) => {
          const products = await this.db.product.findMany({
            where: {
              isActive: true,
              ...(args.category && { category: args.category }),
              ...(args.minPrice && { price: { gte: args.minPrice } }),
              ...(args.maxPrice && { price: { lte: args.maxPrice } }),
            },
            skip: args.offset || 0,
            take: Math.min(args.limit || 20, 100),
            include: { seller: true, _count: { select: { likes: true } } },
          });

          const totalCount = await this.db.product.count({
            where: { isActive: true },
          });

          return {
            nodes: products,
            totalCount,
            hasNextPage: (args.offset || 0) + products.length < totalCount,
          };
        },

        productById: async (_, { id }) => {
          return await this.db.product.findUnique({
            where: { id },
            include: { seller: true, reviews: { include: { user: true } } },
          });
        },

        searchProducts: async (_, { query, limit = 10 }) => {
          return await this.db.product.findMany({
            where: {
              isActive: true,
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
              ],
            },
            take: limit,
            include: { seller: true },
          });
        },

        // Orders
        myOrders: async (_, { limit = 10 }, context) => {
          if (!context.user) throw new Error('Not authenticated');

          return await this.db.order.findMany({
            where: { userId: context.user.id },
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: { items: { include: { product: true } } },
          });
        },

        orderById: async (_, { id }, context) => {
          if (!context.user) throw new Error('Not authenticated');

          return await this.db.order.findUnique({
            where: { id },
            include: { items: { include: { product: true } } },
          });
        },

        // User
        me: async (_, __, context) => {
          if (!context.user) throw new Error('Not authenticated');

          return await this.db.user.findUnique({
            where: { id: context.user.id },
            include: { sellerProfile: true },
          });
        },

        userById: async (_, { id }) => {
          return await this.db.user.findUnique({
            where: { id },
            include: { sellerProfile: true, _count: { select: { followers: true } } },
          });
        },

        // Creator
        creatorStats: async (_, { creatorId }) => {
          return await this.creator.getCreatorStats(creatorId);
        },

        // Recommendations
        recommendedProducts: async (_, { limit = 10 }, context) => {
          if (!context.user) return [];
          // Would call recommendation engine
          return [];
        },
      },

      Mutation: {
        createProduct: async (_, { input }, context) => {
          if (!context.user) throw new Error('Not authenticated');

          return await this.db.product.create({
            data: {
              ...input,
              sellerId: context.user.id,
            },
          });
        },

        createOrder: async (_, { items }, context) => {
          if (!context.user) throw new Error('Not authenticated');

          // Create order logic
          return null;
        },

        followUser: async (_, { userId }, context) => {
          if (!context.user) throw new Error('Not authenticated');

          await this.db.follow.create({
            data: {
              followerId: context.user.id,
              followingId: userId,
            },
          });

          return true;
        },
      },
    };
  }
}

module.exports = { typeDefs, GraphQLResolvers };
