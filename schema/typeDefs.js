const { gql } = require("apollo-server-express");

const typeDefs = gql`
  type Company{
    _id: ID!
    Employer_Name: String!
    banks: [Bank]!
  }
  
  type Bank{
    name: String!
    category: String
  }
  
  type User{
    _id: ID!
    service: String!
    name: String!
  }
  
  type Status{
    value: Boolean!
    message: String
  }
  
  type Query{
    company(id: ID!): Company
    companies(search: String!): [Company]
    user: User
  }
  
  type Mutation{
    sendOtp(number: String!, old: Boolean!): Status
    verify(session: String!, otp: String!, password: String!, name: String, email: String, old: Boolean!): User
    login(number: String!, password: String!): User
    logout: Status
  }
  
`;

module.exports = typeDefs;
